// Lektionskollen — plan generation.
//
// Needs AI_BASE_URL, AI_MODEL and AI_API_KEY as function secrets. See
// supabase/functions/README.md for the values per provider.
//
// There used to be a written-plan fallback here for when no model was
// configured, and it served the product well while there wasn't one. It is
// gone, because it had quietly stopped working: those templates predate the
// worked example, the recap, the misconceptions and the three task tiers, so
// lk_validate_full now blocks every plan they produce. A coordinator would
// have been handed a plan they could not approve, with nothing saying why.
//
// Saying the generator is unavailable is worth more than a plan that cannot be
// used, because it points at the two things that still work: the class
// teacher's own linked plan, and the bank of approved plans.

import { buildConvertMessages, buildMessages, buildTranslateMessages } from './prompt.ts'
import { parseModelJson } from './repair.ts'

// Temperature is omitted unless AI_TEMPERATURE is set. Anthropic's OpenAI
// compatibility layer returns 400 for any value below 1 on current models, and
// every call here used to pin it low — so every call would have failed the
// moment a Claude key was connected. Providers that do accept it (OpenAI,
// Gemini, OpenRouter) can have it back by setting the variable.
const AI_TEMP = Deno.env.get('AI_TEMPERATURE');
const temperature = () => (AI_TEMP ? { temperature: Number(AI_TEMP) } : {});

// Thinking is on by default on Claude 5 models and is billed against the same
// max_tokens as the answer, so a plan this size ran out of budget mid-JSON:
// completion_tokens came back at exactly the ceiling, three times running, with
// the tasks truncated away. OpenAI's reasoning_effort is ignored by the
// compatibility layer; the budget is set with a `thinking` field on the request
// body instead.
//
// A provider that does not know the field may reject the whole request rather
// than ignore it, so this is only sent to Anthropic — where leaving it out is
// the broken case, not the safe one. Anywhere else it needs setting on purpose.
const AI_THINK = Deno.env.get('AI_THINKING_BUDGET');
const IS_ANTHROPIC = /api\.anthropic\.com/i.test(Deno.env.get('AI_BASE_URL') ?? '');
const thinking = () => {
  const budget = AI_THINK !== undefined ? Number(AI_THINK) : IS_ANTHROPIC ? 3000 : NaN;
  if (!Number.isFinite(budget)) return {};
  return budget > 0
    ? { thinking: { type: 'enabled', budget_tokens: budget } }
    : { thinking: { type: 'disabled' } };
};


const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  const r = (body.request ?? {}) as Record<string, unknown>
  if (!r.subject || !r.year_group || !r.minutes) {
    return json({ error: 'subject, year_group and minutes are required' }, 400)
  }

  // ── The day's allowance ────────────────────────────────
  // Plans are the meter, because a plan is what a school asks for and what it
  // would recognise on a bill. Nobody plans their day in tokens.
  //
  // The call goes out as the caller, not as the service role, so the school is
  // the one whose coordinator pressed the button rather than one the client
  // could name for itself.
  const fwd = {
    apikey: req.headers.get('apikey') ?? '',
    Authorization: req.headers.get('Authorization') ?? '',
    'Content-Type': 'application/json',
  }
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const url = Deno.env.get('SUPABASE_URL')
    if (!url) return null
    try {
      const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
        method: 'POST', headers: fwd, body: JSON.stringify(args),
      })
      return res.ok ? await res.json() : null
    } catch { return null }
  }

  // ── What this class was actually doing ──────────────────
  // A competent lesson on the wrong topic is still the wrong lesson, and until
  // now every plan without an explicit topic was a guess from the curriculum.
  // If the department has filled in its term plan, the last three weeks are
  // the single most useful thing we can tell the model. Nothing fails without
  // it: a school that has entered nothing gets exactly the behaviour it had
  // before.
  const fetchRecent = async () => {
    if (translate || convertText || !r.subject || !r.year_group) return null
    const rows = await rpc('lk_term_recent',
      { p_subject: r.subject, p_year: r.year_group, p_week: null, p_back: 3 })
    return Array.isArray(rows) && rows.length ? rows : null
  }

  const baseUrl = Deno.env.get('AI_BASE_URL')
  const bigModel = Deno.env.get('AI_MODEL')
  // A translation needs no planning, so it can run on the cheaper model.
  const translate = body.translate as Record<string, unknown> | undefined
  // A teacher's own plan, pasted or uploaded: sorted into LK's shape, never
  // written. Capped so a whole pasted handbook cannot run up a bill.
  const convertIn = body.convert as { text?: string } | undefined
  const convertText = typeof convertIn?.text === 'string' ? convertIn.text.slice(0, 20_000).trim() : ''
  if (convertIn && !convertText) return json({ error: 'empty_text' }, 400)
  const model = translate ? (Deno.env.get('AI_MODEL_SMALL') || bigModel) : bigModel
  const t0 = Date.now()

  // ── No model configured ──────────────────────────────────
  if (!baseUrl || !bigModel) {
    return json({ error: 'no_model', detail: 'The plan generator is not configured.' }, 503)
  }

  // A translation is part of the plan it came with, so it does not take a
  // second unit — the school asked for one plan and is getting one plan.
  let took = false
  let unchecked = false
  // A repair works on a plan that already exists, so it is not a new plan.
  const repairIn = body.repair as { plan?: Record<string, unknown> } | undefined
  if (!translate && !repairIn?.plan) {
    const q = await rpc('lk_quota_take', { p_kind: 'plan' })
    if (q && q.ok === false && q.reason === 'limit') {
      return json({
        error: 'quota', kind: 'plan',
        limit: q.limit, resets_at: q.resets_at,
      }, 429)
    }
    took = !!(q && q.ok)
    // If the allowance could not be read, generate anyway: a school at ten to
    // eight needs the plan more than we need the count. But say so in the
    // response rather than letting the ceiling fail silently.
    unchecked = !q
  }
  // Nothing is charged for a request that produced nothing.
  const refund = async () => { if (took) await rpc('lk_quota_give_back', { p_kind: 'plan' }) }

  // Read after the allowance, before the model: a request that is about to be
  // refused should not cost a query, and a term plan that cannot be read must
  // not stop the plan being written.
  const recent = await fetchRecent()

  // ── Model configured ─────────────────────────────────────
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 300_000)
  try {
    const messages = translate
      ? buildTranslateMessages(translate, String(r.language || 'sv'))
      : convertText
      ? buildConvertMessages(convertText, r)
      : buildMessages({ ...r, recent })
    const call = (msgs: unknown[]) => fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(Deno.env.get('AI_API_KEY') ? { Authorization: `Bearer ${Deno.env.get('AI_API_KEY')}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: msgs,
        ...temperature(),
        ...thinking(),
        // 8000 was fine when nothing thought before answering. Current Claude
        // models reason first, and that reasoning is billed against the same
        // budget — so a plan this size could burn the whole allowance before a
        // single character of JSON came out, and the response arrived empty.
        max_tokens: Number(Deno.env.get('AI_MAX_TOKENS') ?? 16000),
        stream: false,
        ...(Deno.env.get('AI_JSON_MODE') === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: ctl.signal,
    })
    let out: Record<string, any> = { model, choices: [{ finish_reason: 'repair' }] }
    let content = ''
    let data = (repairIn?.plan ?? null) as Record<string, unknown> | null
    let repaired = false
    if (repairIn?.plan) {
      content = JSON.stringify(repairIn.plan)
    } else {
      const res = await call(messages)

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        await refund()
        return json({ error: `Model error ${res.status}: ${text.slice(0, 300)}` }, 502)
      }
      out = await res.json()
      content = out?.choices?.[0]?.message?.content ?? ''
      if (!content) {
        // An empty answer used to say only that it was empty, which is the least
        // useful thing it could say. The provider always explains itself in
        // finish_reason and usage; pass that on.
        const fin = out?.choices?.[0]?.finish_reason ?? 'unknown'
        await refund()
        return json({
          error: `Model returned no content (finish_reason: ${fin})`,
          finish_reason: fin, usage: out?.usage, model: out?.model ?? model,
        }, 502)
      }

      ;({ data, repaired } = parseModelJson(content))
    }

    // ── The quality gate, applied before the coordinator sees anything ──
    // lk_check_plan is the same check that blocks approval. Running it here
    // means a fault the model can fix is fixed once, by the model, with the
    // list in front of it - instead of being handed to a coordinator who can
    // only press "generate another". One round only: it costs a second call,
    // and a plan that is still faulty after being told what is wrong is better
    // shown with its faults than looped on. Any failure here keeps the first
    // plan, so this can only ever help.
    let gate: { blockers?: number; problems?: Array<Record<string, string>> } | null = null
    let fixedByGate = false
    // Not for a teacher's own plan: the repair round would fill gaps by
    // writing content, which is exactly what converting must not do. The
    // teacher sees the gaps in the editor instead.
    if (!translate && !convertText && data) {
      const check = (plan: unknown) => rpc('lk_check_plan',
        { p_body: plan, p_minutes: Number(r.minutes) || null, p_language: String(r.language || 'sv') })
      gate = await check(data)
      const blockers = (g: typeof gate) => (g?.problems ?? []).filter((x) => x.level === 'blocker')
      // A repair of an existing plan gets a second round; a fresh plan gets one.
      for (let round = 0; round < (repairIn?.plan ? 2 : 1) && gate && blockers(gate).length; round++) {
        try {
          const list = blockers(gate).map((x) => `- ${x.where}: ${x.detail}`).join('\n')
          const res2 = await call([
            ...messages,
            { role: 'assistant', content: JSON.stringify(data) },
            { role: 'user', content:
              'The plan has faults that stop a substitute from using it:\n' + list +
              '\n\nFix every one. Where a text or sentence is referred to, write it out in full inside the question. ' +
              'Put any quoted sentence in quote marks. Change nothing else. Return the complete corrected plan as JSON only.' },
          ])
          if (!res2.ok) break
          const out2 = await res2.json()
          const c2: string = out2?.choices?.[0]?.message?.content ?? ''
          const p2 = c2 ? parseModelJson(c2) : null
          if (!p2?.data) break
          const g2 = await check(p2.data)
          if (!g2 || blockers(g2).length >= blockers(gate).length) break
          data = p2.data; repaired = p2.repaired; gate = g2; fixedByGate = true
        } catch { /* keep the first plan */ }
      }
    }
    clearTimeout(timer)
    return json({
      plan: data, model: out.model ?? model, source: 'model', repaired,
      gate_fixed: fixedByGate, gate_blockers: gate ? (gate.problems ?? []).filter((x) => x.level === 'blocker').length : undefined,
      finish_reason: out?.choices?.[0]?.finish_reason,
      quota: unchecked ? 'unchecked' : undefined,
      usage: out.usage, ms: Date.now() - t0,
    })
  } catch (e) {
    clearTimeout(timer)
    await refund()
    const msg = (e as Error).name === 'AbortError' ? 'Model timed out' : `Could not reach the model at ${baseUrl}`
    return json({ error: msg }, 502)
  }
})

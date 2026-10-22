// Lektionskollen — plan generation.
//
// Two modes, decided by env, so the product works before a model is chosen:
//   AI_BASE_URL + AI_MODEL set -> call an OpenAI-compatible endpoint
//   neither set               -> return a written plan from the library below
//
// To go live: set AI_BASE_URL, AI_MODEL and (if hosted) AI_API_KEY as function
// secrets. No code change, no redeploy of anything else.

import { buildMessages, buildTranslateMessages } from './prompt.ts'
import { parseModelJson } from './repair.ts'
import { cannedPlan } from './library.ts'

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

  const baseUrl = Deno.env.get('AI_BASE_URL')
  const bigModel = Deno.env.get('AI_MODEL')
  // A translation needs no planning, so it can run on the cheaper model.
  const translate = body.translate as Record<string, unknown> | undefined
  const model = translate ? (Deno.env.get('AI_MODEL_SMALL') || bigModel) : bigModel
  const t0 = Date.now()

  // ── No model configured: serve a written plan ────────────
  if (!baseUrl || !bigModel) {
    const plan = cannedPlan(r)
    return json({ plan, model: 'canned', source: 'library', repaired: false, ms: Date.now() - t0 })
  }

  // ── Model configured ─────────────────────────────────────
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 300_000)
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(Deno.env.get('AI_API_KEY') ? { Authorization: `Bearer ${Deno.env.get('AI_API_KEY')}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: translate ? buildTranslateMessages(translate, String(r.language || 'sv')) : buildMessages(r),
        ...temperature(),
        max_tokens: 8000,
        stream: false,
        ...(Deno.env.get('AI_JSON_MODE') === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: ctl.signal,
    })
    clearTimeout(timer)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return json({ error: `Model error ${res.status}: ${text.slice(0, 300)}` }, 502)
    }
    const out = await res.json()
    const content: string = out?.choices?.[0]?.message?.content ?? ''
    if (!content) return json({ error: 'Model returned an empty response' }, 502)

    const { data, repaired } = parseModelJson(content)
    return json({
      plan: data, model: out.model ?? model, source: 'model', repaired,
      finish_reason: out?.choices?.[0]?.finish_reason,
      usage: out.usage, ms: Date.now() - t0,
    })
  } catch (e) {
    clearTimeout(timer)
    const msg = (e as Error).name === 'AbortError' ? 'Model timed out' : `Could not reach the model at ${baseUrl}`
    return json({ error: msg }, 502)
  }
})

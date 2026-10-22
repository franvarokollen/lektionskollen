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

import { buildMessages, buildTranslateMessages } from './prompt.ts'
import { parseModelJson } from './repair.ts'

// Temperature is omitted unless AI_TEMPERATURE is set. Anthropic's OpenAI
// compatibility layer returns 400 for any value below 1 on current models, and
// every call here used to pin it low — so every call would have failed the
// moment a Claude key was connected. Providers that do accept it (OpenAI,
// Gemini, OpenRouter) can have it back by setting the variable.
const AI_TEMP = Deno.env.get('AI_TEMPERATURE');
const temperature = () => (AI_TEMP ? { temperature: Number(AI_TEMP) } : {});


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

  // ── No model configured ──────────────────────────────────
  if (!baseUrl || !bigModel) {
    return json({ error: 'no_model', detail: 'The plan generator is not configured.' }, 503)
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
    clearTimeout(timer)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return json({ error: `Model error ${res.status}: ${text.slice(0, 300)}` }, 502)
    }
    const out = await res.json()
    const content: string = out?.choices?.[0]?.message?.content ?? ''
    if (!content) {
      // An empty answer used to say only that it was empty, which is the least
      // useful thing it could say. The provider always explains itself in
      // finish_reason and usage; pass that on.
      const fin = out?.choices?.[0]?.finish_reason ?? 'unknown'
      return json({
        error: `Model returned no content (finish_reason: ${fin})`,
        finish_reason: fin, usage: out?.usage, model: out?.model ?? model,
      }, 502)
    }

    const { data, repaired } = parseModelJson(content)
    return json({
      plan: data, model: out.model ?? model, source: 'model', repaired,
      usage: out.usage, ms: Date.now() - t0,
    })
  } catch (e) {
    clearTimeout(timer)
    const msg = (e as Error).name === 'AbortError' ? 'Model timed out' : `Could not reach the model at ${baseUrl}`
    return json({ error: msg }, 502)
  }
})

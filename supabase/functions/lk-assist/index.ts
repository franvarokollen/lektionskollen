// Lektionskollen — in-lesson help.
//
// Same two modes as lk-generate, decided by env:
//   AI_BASE_URL + AI_MODEL set -> call an OpenAI-compatible endpoint
//   neither set               -> return a written teaching move
//
// The written path cannot invent subject content and does not pretend to;
// it returns a technique the substitute can apply to what is already on the
// board. The response says which path produced it so the UI can say so too.

import { buildMessages } from './prompt.ts'
import { parseModelJson } from '../_shared/repair.ts'
import { writtenPair } from './library.ts'
import type { AssistReq, Extra, ExtraPair } from './types.ts'
import { cors, json } from '../_shared/http.ts'
import { temperature, thinking } from '../_shared/model.ts'

const KINDS = ['explain', 'exercise', 'level', 'filler']

// ── Cache ────────────────────────────────────────────────────
// Same section text + kind + variant + language (+ subject/year) gets the
// stored answer instead of another model call. Only real model answers are
// cached; the written library is free to serve. The cache holds lesson
// content only - no pupil or staff data.
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
function cacheKey(b: AssistReq): Promise<string> {
  const norm = (x: unknown) => String(x ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
  return sha256([
    b.kind, norm(b.variant), b.language === 'en' ? 'en' : 'sv', norm(b.subject), norm(b.year_group),
    norm(b.section_label), norm(b.section_text).slice(0, 600),
    b.kind === 'filler' ? String(b.minutes_left ?? '') : '',
  ].join('|'))
}
async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null
  try {
    const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
    return res.ok ? await res.json() : null
  } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // The cache runs as the service role; the allowance must run as the caller,
  // so the school is the one whose substitute pressed the button rather than
  // one the client could name for itself.
  const userRpc = async (name: string, args: Record<string, unknown>) => {
    const url = Deno.env.get('SUPABASE_URL')
    if (!url) return null
    try {
      const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: {
          apikey: req.headers.get('apikey') ?? '',
          Authorization: req.headers.get('Authorization') ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args),
      })
      return res.ok ? await res.json() : null
    } catch { return null }
  }

  let body: AssistReq
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  if (!body.kind || !KINDS.includes(body.kind)) {
    return json({ error: `kind must be one of ${KINDS.join(', ')}` }, 400)
  }

  const baseUrl = Deno.env.get('AI_BASE_URL')
  // Extras are short and time-critical: a cheaper, faster model is the right default.
  const model = Deno.env.get('AI_MODEL_SMALL') || Deno.env.get('AI_MODEL')
  const t0 = Date.now()

  const fallback = (source: string) =>
    json({ ...writtenPair(body), model: 'canned', source, ms: Date.now() - t0 })

  // ── No model configured: serve a written teaching move ───
  if (!baseUrl || !model) return fallback('library')

  // ── Already answered? ────────────────────────────────────
  const key = await cacheKey(body)
  // "Generate a new one" asks for a different answer, so it skips the read.
  // The new answer is still written back and becomes the stored one.
  const hit = body.fresh ? null
    : await rpc('lk_cache_get', { p_key: key }) as { pair?: ExtraPair, model?: string } | null
  if (hit?.pair) {
    return json({ ...hit.pair, model: hit.model ?? model, source: 'cache', ms: Date.now() - t0 })
  }

  // ── The plan's allowance for extras ─────────────────────
  // Extras support a plan that already exists, so they do not spend the
  // school's daily plan allowance; each plan has its own cap per day. It is
  // taken here, in one statement, before the model is called — a cap only the
  // page enforced was a cap anyone could skip, and a request that names no
  // plan used to skip it too. Cache hits above are free and not counted.
  //
  // Over it, or with no plan named, the written move is still a good answer,
  // so this falls back rather than refusing: a substitute mid-lesson gets
  // help either way.
  const take = await userRpc('lk_assist_take', {
    p_token: typeof body.token === 'string' ? body.token : null,
    p_plan: typeof body.plan_id === 'string' ? body.plan_id : null,
  }) as { ok?: boolean } | null
  if (!take?.ok) return fallback('library')

  // ── Model configured ─────────────────────────────────────
  // Short timeout on purpose. A substitute standing in front of a class
  // will not wait sixty seconds, and a written fallback beats a spinner.
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 25_000)
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(Deno.env.get('AI_API_KEY') ? { Authorization: `Bearer ${Deno.env.get('AI_API_KEY')}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: buildMessages(body),
        ...temperature(),
        ...thinking(1024),
        // Both languages in one response, plus room for the thinking budget
        // above it.
        max_tokens: Number(Deno.env.get('AI_ASSIST_MAX_TOKENS') ?? 5000),
        stream: false,
        ...(Deno.env.get('AI_JSON_MODE') === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: ctl.signal,
    })
    clearTimeout(timer)

    if (!res.ok) return fallback('fallback')

    const out = await res.json()
    const content: string = out?.choices?.[0]?.message?.content ?? ''
    if (!content) return fallback('fallback')

    // A malformed answer is caught below and becomes the written move.
    const { data, repaired } = parseModelJson(content)
    const raw = data as Extra & { alt?: Extra }
    if (!raw?.title || !Array.isArray(raw?.lines) || !raw.lines.length) return fallback('fallback')

    // The alt is optional: a model that skipped it should not cost the
    // substitute their answer. The page then says this one is only in the
    // other language rather than silently showing the wrong one.
    const { alt, ...extra } = raw
    const lang = body.language === 'en' ? 'en' : 'sv'
    const altLang = lang === 'en' ? 'sv' : 'en'
    const altOk = alt?.title && Array.isArray(alt?.lines) && alt.lines.length

    const pair: ExtraPair = {
      language: lang,
      extra: extra as Extra,
      language_alt: altLang,
      extra_alt: altOk ? { ...(alt as Extra), minutes: alt!.minutes ?? extra.minutes } : null,
    }
    const usedModel = out.model ?? model
    // Only complete answers are worth keeping for the next substitute.
    if (pair.extra_alt) await rpc('lk_cache_put', { p_key: key, p_pair: pair, p_model: usedModel })
    return json({
      ...pair, model: usedModel, source: 'model', repaired,
      usage: out.usage, ms: Date.now() - t0,
    })
  } catch {
    clearTimeout(timer)
    // Mid-lesson, never show an error where a usable answer will do.
    return fallback('fallback')
  }
})

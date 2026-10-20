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
import { parseModelJson } from './repair.ts'
import { writtenPair } from './library.ts'
import type { AssistReq, Extra, ExtraPair } from './types.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

const KINDS = ['explain', 'exercise', 'level', 'filler']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: AssistReq
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  if (!body.kind || !KINDS.includes(body.kind)) {
    return json({ error: `kind must be one of ${KINDS.join(', ')}` }, 400)
  }

  const baseUrl = Deno.env.get('AI_BASE_URL')
  const model = Deno.env.get('AI_MODEL')
  const t0 = Date.now()

  const fallback = (source: string) =>
    json({ ...writtenPair(body), model: 'canned', source, ms: Date.now() - t0 })

  // ── No model configured: serve a written teaching move ───
  if (!baseUrl || !model) return fallback('library')

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
        temperature: 0.5,
        max_tokens: 2600,   // both languages in one response
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
    return json({
      ...pair, model: out.model ?? model, source: 'model', repaired,
      usage: out.usage, ms: Date.now() - t0,
    })
  } catch {
    clearTimeout(timer)
    // Mid-lesson, never show an error where a usable answer will do.
    return fallback('fallback')
  }
})

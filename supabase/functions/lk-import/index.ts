// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
// Turn whatever a head of department already has into week-and-topic rows.
//
// Every school keeps its year planning differently: a spreadsheet with weeks
// down the side, a Google Doc with headings, a wall planner someone typed up,
// an export from SchoolSoft, one Word file per teacher. Writing an importer
// per format is a losing game - there is no finite list, and the next school
// has a new one.
//
// So there is exactly one target shape, { week, topic, note }, and this
// function's only job is to get arbitrary pasted text into it. A model is the
// right tool here, where it was the wrong tool for the plan checks: this is
// genuinely ambiguous ("v.34-35" is two weeks, "HT v3" is a term-relative
// week, a date range needs converting), and there is a person standing right
// there to confirm the result.
//
// Which is the rule this function is built around: IT NEVER SAVES ANYTHING.
// It returns rows for a human to look at, correct and accept. Curriculum
// planning that quietly imported itself wrong would poison every plan built
// on it, and nobody would know where the wrongness came from.

import { cors, json } from '../_shared/http.ts'
import { temperature, thinking } from '../_shared/model.ts'

// Long enough for a full year of planning with notes, short enough that a
// pasted-in whole document cannot run up a bill.
const MAX_CHARS = 20_000

const SYSTEM = [
  'You convert a school department\'s year planning into rows. Nothing else.',
  '',
  'The input is whatever someone pasted: a spreadsheet copied as tab-separated',
  'text, a list, prose with headings, an export from a school system, a table',
  'with the weeks across the top instead of down the side. Read it however it',
  'is laid out.',
  '',
  'OUTPUT one JSON object only, no markdown and no commentary:',
  '{ "rows": [ { "week": number, "topic": string, "note": string } ],',
  '  "unclear": [ { "text": string, "why": string } ] }',
  '',
  'RULES',
  '1. "week" is a calendar week number, 1-53. A bare number in that range at',
  '   the start of a planning line IS a week number - plenty of schools leave',
  '   out the "v." or "week" prefix. Nothing else goes in it.',
  '2. A range ("v.34-36", "weeks 34 to 36") becomes one row per week, each',
  '   carrying the same topic.',
  '3. A date or date range is converted to the ISO week it falls in.',
  '4. "topic" is what is being taught, in the words the school used. Do not',
  '   improve, translate or expand it. Keep it under 80 characters.',
  '5. "note" is only for something a teacher wrote that matters - a test, a',
  '   deadline, a trip, a holiday. Leave it out rather than inventing one.',
  '6. A week that is a holiday, a test week or study day is still a row: that',
  '   is real information about what the class did not cover.',
  '7. INVENT NOTHING. If you cannot tell which week a line belongs to, or what',
  '   the topic is, put the line in "unclear" with a short reason and leave it',
  '   out of "rows". A wrong row is far worse than a missing one, because',
  '   someone will build a lesson on it.',
  '8. Term-relative numbering ("HT week 3", "term week 3") cannot be converted',
  '   without knowing when the term starts. Those lines go in "unclear".',
  '9. Ignore anything that is not year planning: headers, page numbers,',
  '   teacher names, room numbers.',
  '10. Sort "rows" by week. One row per week - if two lines give the same week,',
  '    join their topics with "; ".',
].join('\n')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { raw?: string; subject?: string; year_group?: string }
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }

  const raw = String(body.raw ?? '').trim()
  if (!raw) return json({ error: 'empty', detail: 'Nothing to read.' }, 400)
  if (raw.length > MAX_CHARS) {
    return json({ error: 'too_long', detail: `Paste at most ${MAX_CHARS} characters.`,
                  limit: MAX_CHARS, got: raw.length }, 413)
  }

  const baseUrl = Deno.env.get('AI_BASE_URL')
  const model = Deno.env.get('AI_MODEL_SMALL') || Deno.env.get('AI_MODEL')
  if (!baseUrl || !model) {
    return json({ error: 'no_model', detail: 'No model is configured to read this.' }, 503)
  }

  const t0 = Date.now()
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 60_000)
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(Deno.env.get('AI_API_KEY') ? { Authorization: `Bearer ${Deno.env.get('AI_API_KEY')}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: [
              body.subject ? `Subject: ${body.subject}` : '',
              body.year_group ? `Year group: ${body.year_group}` : '',
              'The planning, exactly as it was pasted:', '', raw,
            ].filter(Boolean).join('\n') },
        ],
        ...temperature(),
        ...thinking(2000),
        max_tokens: Number(Deno.env.get('AI_IMPORT_MAX_TOKENS') ?? 8000),
        stream: false,
      }),
      signal: ctl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      return json({ error: 'upstream', detail: `The model returned ${res.status}.` }, 502)
    }

    const out = await res.json()
    const content: string = out?.choices?.[0]?.message?.content ?? ''
    if (!content) return json({ error: 'empty_answer', detail: 'The model returned nothing.' }, 502)

    let parsed: { rows?: unknown; unclear?: unknown }
    try {
      const i = content.indexOf('{')
      if (i === -1) throw new Error('no object')
      parsed = JSON.parse(content.slice(i, content.lastIndexOf('}') + 1))
    } catch {
      return json({ error: 'unreadable', detail: 'Could not read the model answer.' }, 502)
    }

    // Everything is re-validated here. The model was asked for weeks 1-53 and
    // short topics; what it was asked for and what arrives are different
    // things, and this is the last point before a person sees the rows and
    // starts trusting them.
    const seen = new Map<number, { week: number; topic: string; note?: string }>()
    const dropped: { text: string; why: string }[] = []
    for (const r of Array.isArray(parsed.rows) ? parsed.rows : []) {
      const row = r as { week?: unknown; topic?: unknown; note?: unknown }
      const week = Number(row.week)
      const topic = String(row.topic ?? '').trim()
      if (!Number.isInteger(week) || week < 1 || week > 53) {
        dropped.push({ text: `${row.week} — ${topic}`, why: 'not a week number between 1 and 53' })
        continue
      }
      if (!topic) { dropped.push({ text: `week ${week}`, why: 'no topic' }); continue }
      const note = String(row.note ?? '').trim() || undefined
      const prev = seen.get(week)
      // Rule 10 again, enforced rather than trusted.
      seen.set(week, prev
        ? { week, topic: `${prev.topic}; ${topic}`.slice(0, 160), note: prev.note ?? note }
        : { week, topic: topic.slice(0, 160), note })
    }

    const unclear = (Array.isArray(parsed.unclear) ? parsed.unclear : [])
      .map((u) => {
        const x = u as { text?: unknown; why?: unknown }
        return { text: String(x.text ?? '').trim(), why: String(x.why ?? '').trim() }
      })
      .filter((x) => x.text)
      .concat(dropped)

    return json({
      rows: [...seen.values()].sort((a, b) => a.week - b.week),
      unclear,
      model: out.model ?? model,
      usage: out.usage,
      ms: Date.now() - t0,
    })
  } catch {
    clearTimeout(timer)
    return json({ error: 'failed', detail: 'Could not read that just now.' }, 502)
  }
})

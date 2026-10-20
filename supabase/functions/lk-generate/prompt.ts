// The prompt rules carried over from Vikarieplaneringen. These are the part
// that took eighteen months to get right; change them deliberately.

const ANCHOR: Record<string, string> = {
  sv: 'OUTPUT LANGUAGE: SWEDISH. Every string value in the JSON MUST be in Swedish. JSON keys stay in English exactly as specified.',
  en: 'OUTPUT LANGUAGE: ENGLISH. Every string value in the JSON MUST be in English. JSON keys stay in English exactly as specified.',
}

export const SCHEMA = `{
  "title": string,
  "curriculum": string,
  "goal": string,
  "criteria": string[],
  "readTime": string,
  "summary": string,
  "first90": string[],
  "board": string,
  "equipment": { "need": string, "fallback": string },
  "phases": [ { "t": string, "n": string, "say": string, "pupils": string,
                "expect": string, "checks": [ { "q": string, "a": string } ] } ],
  "materials": [ { "h": string, "body": string } ],
  "tasks": [ { "q": string, "a": string } ],
  "stuck": string, "ahead": string, "wrong": string,
  "exit": { "q": string, "a": string },
  "handover": string
}`

export function buildMessages(r: Record<string, unknown>) {
  const lang = (r.language as string) ?? 'sv'
  const start = (r.starts_at as string) ?? '08:00'

  const system = [
    ANCHOR[lang] ?? ANCHOR.sv, '',
    'You write turnkey lesson plans for SUBSTITUTE teachers (vikarier) in Swedish schools.',
    'The substitute may have ZERO subject knowledge and has never met this class. They must walk in and teach straight from your output.',
    '',
    'HARD RULES',
    '1. No phantom references. Never mention a worksheet, text or resource unless its full content is written in "materials".',
    '2. Embed everything: real questions WITH answers, maths WITH worked solutions, texts written out in full.',
    '3. Exactly ONE lesson. No alternatives, no "choose A or B".',
    '4. Script the teacher: what the substitute SAYS goes in quotes in "say".',
    '5. Anticipate pupils: likely answers, the common misconception, and the recovery move.',
    '6. Check understanding without hands-up (cold call, mini-whiteboards, exit ticket).',
    '7. Structure follows explicit instruction (Skolverket strukturerad undervisning / Rosenshine).',
    `8. "t" on every phase is a REAL CLOCK RANGE starting at ${start}, e.g. "${start}-...". The phases must fill exactly ${r.minutes} minutes.`,
    '9. Only assume the listed resources.',
    '10. "first90" is what the substitute does in the first ninety seconds: greeting, register, seating, expectations.',
    '11. "wrong" is the fallback when the activity fails or the room will not settle. Be concrete.',
    '12. Align to Skolverket LGR22 (grundskola) or Gy22 (gymnasiet) for this subject and year.',
    '13. Swedish schools mostly have no bells. Never write "before the bell" or "innan det ringer" - say before the lesson starts.',
    '',
    'Respond with ONE JSON object only. No markdown, no code fences, no commentary:',
    SCHEMA, '',
    ANCHOR[lang] ?? ANCHOR.sv,
  ].join('\n')

  const user = [
    `Subject: ${r.subject}`,
    `Year group: ${r.year_group}`,
    `Lesson length: ${r.minutes} minutes, starting ${start}`,
    r.group_name ? `Class: ${r.group_name}` : '',
    r.room ? `Room: ${r.room}` : '',
    `Topic: ${(r.topic as string)?.trim() || 'Not specified - choose a self-contained topic from the central content that does not depend on the previous lesson.'}`,
    (r.notes as string)?.trim() ? `Notes from the school: ${r.notes}` : '',
    r.lesson_type ? `Lesson type: ${r.lesson_type}` : '',
    r.level ? `Difficulty: ${r.level}` : '',
    r.sub_knowledge ? `The substitute's subject knowledge: ${r.sub_knowledge}` : '',
    `Available in the room: ${Array.isArray(r.resources) && r.resources.length ? (r.resources as string[]).join(', ') : 'whiteboard, paper and pens only'}`,
  ].filter(Boolean).join('\n')

  return [{ role: 'system', content: system }, { role: 'user', content: user }]
}

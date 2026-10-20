// Prompts for in-lesson help. Different job from plan generation: this is
// asked for while 28 pupils are waiting, so the output must be short enough
// to read at a glance and usable without preparation.

import type { AssistReq } from './types.ts'

const ANCHOR: Record<string, string> = {
  sv: 'OUTPUT LANGUAGE: SWEDISH. Every string value in the JSON MUST be in Swedish. JSON keys stay in English exactly as specified.',
  en: 'OUTPUT LANGUAGE: ENGLISH. Every string value in the JSON MUST be in English. JSON keys stay in English exactly as specified.',
}

export const SCHEMA = `{
  "title": string,
  "lines": string[],
  "board": string,
  "tasks": [ { "q": string, "a": string } ],
  "minutes": number
}`

const COMMON = [
  'You are helping a SUBSTITUTE teacher (vikarie) who is standing in front of a class RIGHT NOW.',
  'They pressed a button in the middle of the lesson. They will read your answer off a phone while the class waits.',
  '',
  'HARD RULES',
  '1. Short. "lines" is at most six items, each one sentence or two. Nothing to read in advance.',
  '2. The substitute may have ZERO subject knowledge. Never assume they can improvise or fill a gap.',
  '3. Every question you give carries its answer. No question without an answer.',
  '4. No phantom references. Never mention a worksheet, textbook page, video or file. If the class needs to see something, put it in "board" for them to write up.',
  '5. Script what the substitute SAYS in quotes.',
  '6. Assume whiteboard, paper and pens only.',
  '7. Swedish schools mostly have no bells. Never write "before the bell" or "innan det ringer" - say before the lesson starts or when the lesson ends.',
  '8. Do not re-teach the whole lesson. Answer only what was asked.',
]

function context(r: AssistReq): string {
  return [
    r.subject ? `Subject: ${r.subject}` : '',
    r.year_group ? `Year group: ${r.year_group}` : '',
    r.topic ? `Lesson topic: ${r.topic}` : '',
    r.section_label ? `The part they pressed on: ${r.section_label}` : '',
    r.section_text ? `What that part of the plan says:\n${r.section_text}` : '',
  ].filter(Boolean).join('\n')
}

const TASK: Record<string, (r: AssistReq) => string[]> = {
  explain: () => [
    'TASK: the class did not understand this part. Explain the SAME idea a different way.',
    'Use a different route than the plan did: a concrete analogy, a drawing described step by step, a worked example, or a physical demonstration with things in the room.',
    'Do not simply repeat the plan in other words. Change the approach.',
    '"board" is what to draw or write up while explaining.',
  ],
  exercise: () => [
    'TASK: the class needs more practice on exactly this part before moving on.',
    'Give four to six questions on the same idea, easiest first, each with its answer.',
    'Put the questions in "board" exactly as they should be written up, and in "tasks" with answers for the substitute.',
  ],
  level: (r) => r.variant === 'harder'
    ? [
        'TASK: this part was too easy. Give a harder version of the SAME idea.',
        'Stay on the same content - do not move to the next topic. Add depth: multiple steps, reasoning, an explain-why.',
        'Four to six questions with answers.',
      ]
    : [
        'TASK: this part was too hard. Give an easier way into the SAME idea.',
        'Break it into smaller steps, start with something the class can certainly do, and build up.',
        'Four to six questions with answers, the first one almost trivially easy.',
      ],
  filler: (r) => [
    `TASK: the substitute has ${r.minutes_left ?? 10} minutes left and needs to fill them usefully.`,
    'Give ONE self-contained activity on the lesson topic that fits that time and needs no preparation and no materials beyond whiteboard, paper and pens.',
    'It must be worth doing - revision that consolidates the lesson, not busywork.',
    `Set "minutes" to ${r.minutes_left ?? 10}.`,
  ],
}

export function buildMessages(r: AssistReq) {
  const lang = r.language ?? 'sv'
  const system = [
    ANCHOR[lang] ?? ANCHOR.sv, '',
    ...COMMON, '',
    ...(TASK[r.kind] ?? TASK.explain)(r), '',
    'Respond with ONE JSON object only. No markdown, no code fences, no commentary:',
    SCHEMA, '',
    ANCHOR[lang] ?? ANCHOR.sv,
  ].join('\n')

  return [{ role: 'system', content: system }, { role: 'user', content: context(r) }]
}

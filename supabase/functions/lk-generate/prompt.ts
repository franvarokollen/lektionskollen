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
  "equipment": { "need": string, "fallback": string, "where": string },
  "recall": { "why": string, "qs": [ { "q": string, "a": string } ] },
  "model": { "p": string,
             "st": [ { "b": string, "s": string } ],
             "a": string, "tq": string, "ta": string },
  "misconceptions": [ { "t": string, "w": string, "s": string } ],
  "phases": [ { "t": string, "n": string, "say": string, "pupils": string,
                "expect": string, "board": string,
                "checks": [ { "q": string, "a": string } ] } ],
  "materials": [ { "h": string, "body": string } ],
  "tasks": [ { "q": string, "a": string, "tier": "support" | "core" | "extension" } ],
  "stuck": string, "ahead": string, "wrong": string,
  "exit": { "q": string, "a": string },
  "handover": string
}`


/** The school year as a number, F = 0, or null when it is not a grundskola
 *  year (Gy1 and so on get no age rules rather than wrong ones). */
export function yearNumber(y: unknown): number | null {
  const k = String(y ?? '').trim()
  if (/^(f|fsk|f-klass|förskoleklass|forskoleklass)$/i.test(k)) return 0
  const m = /^(?:åk|ak|årskurs)\s*(\d{1,2})$/i.exec(k)
  if (!m) return null
  const n = Number(m[1])
  return n >= 1 && n <= 9 ? n : null
}

/** What fits the pupils in the room. A plan for six-year-olds that is an
 *  Åk 6 plan with a smaller number on it cannot be taught: they cannot read
 *  the task, and the substitute is left to improvise the whole lesson. */
export function stageRules(year: unknown): string[] {
  const n = yearNumber(year)
  if (n === null) return []
  if (n <= 3) {
    return [
      '',
      `YEAR-GROUP FIT: ${n === 0 ? 'förskoleklass' : 'Åk ' + n}, pupils aged ${n + 6}-${n + 7}. This changes the whole plan, not just the words.`,
      n <= 1
        ? '- Most pupils cannot read yet. The substitute reads EVERY instruction and question aloud. Pupils answer aloud, by pointing, drawing, building, counting or moving. Written work is one word or one number at most.'
        : '- Reading is still new. The substitute reads every instruction aloud first. Written work is one short sentence at most; most answers are spoken, drawn or built.',
      '- One instruction at a time, in very short sentences, with words from the pupils\' everyday life.',
      '- No stretch longer than about ten minutes without a change of mode. Put one short movement, song or stand-up-and-show break inside the independent phase.',
      '- Board lines are numbers, a single word, or a picture described in brackets, e.g. "[draw: 3 apples]". Never a paragraph.',
      '- Never rely on a worksheet the pupils must read. Tasks use objects found in a classroom, fingers, pencils or drawing.',
      '- "first90" includes how to bring the group together and how to get quiet without raising your voice.',
    ]
  }
  if (n <= 6) {
    return [
      '',
      `YEAR-GROUP FIT: Åk ${n}, pupils aged ${n + 6}-${n + 7}. They read a short paragraph and write sentences.`,
      '- Any text a pupil must read is at most 80 words, in plain sentences. Concrete example before abstract rule.',
      '- Work stretches of 15-20 minutes at most, with a clear change between them.',
    ]
  }
  return [
    '',
    `YEAR-GROUP FIT: Åk ${n}, pupils aged ${n + 6}-${n + 7}. They handle abstract ideas; define every subject word the first time it is used.`,
  ]
}

const RISKY = /(idrott|slöjd|hem- och konsument|hemkunskap|kemi|fysik|teknik|bild|^no$|naturorienterande)/i

/** Subjects where a non-specialist substitute could get a pupil hurt. */
export function needsSafety(subject: unknown): boolean {
  return RISKY.test(String(subject ?? '').trim())
}

export function safetyRules(subject: unknown): string[] {
  if (!needsSafety(subject)) return []
  return [
    '',
    'SAFETY. This subject has physical risk and the substitute is not a specialist.',
    '- No hot surfaces, knives, open flame, machines, power tools, chemicals, sharp or heavy equipment, and no gymnastics apparatus, climbing or throwing, unless a specialist teacher is in the room. Teach the safe version instead: theory, planning, designing, drawing, discussion, or a demonstration with nothing hazardous in it.',
    '- The last item in "first90" is ONE safety sentence the substitute says aloud to the class, specific to this lesson.',
    '- "equipment.need" names any protective gear, or says plainly that none is needed.',
    '- "wrong" says what to do if a pupil is hurt: stop the activity, call the school\'s own first-aid contact. Never invent a phone number.',
  ]
}

type RecentWeek = { week?: number; topic?: string; note?: string }

/** The department's own term plan, as lines the model can read. */
function recentOf(r: Record<string, unknown>): string {
  const rows = r.recent as RecentWeek[] | null | undefined
  if (!Array.isArray(rows) || !rows.length) return ''
  return rows
    .map((x) => `  week ${x.week}: ${x.topic}${x.note ? ` (${x.note})` : ''}`)
    .join('\n')
}

export function buildMessages(r: Record<string, unknown>) {
  const recentLines = recentOf(r)
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
    '4b. Any sentence or text the pupils are asked about goes in quote marks INSIDE the question, written out in full ("Is \"The school starts at 8\" a fact or an opinion?"). Never "the text you were given" or "the sentence on the board" without the words themselves.',
    '5. Anticipate pupils: likely answers, the common misconception, and the recovery move.',
    '6. Check understanding without hands-up (cold call, mini-whiteboards, exit ticket).',
    '7. Structure follows explicit instruction (Skolverket strukturerad undervisning / Rosenshine).',
    `8. "t" on every phase is a REAL CLOCK RANGE starting at ${start}, e.g. "${start}-...". The phases must fill exactly ${r.minutes} minutes.`,
    '9. Only assume the listed resources.',
    '10. "first90" is what the substitute does in the first ninety seconds: greeting, register, seating, expectations.',
    '11. "wrong" is the fallback when the activity fails or the room will not settle. Be concrete.',
    '12. Align to Skolverket LGR22 (grundskola, förskoleklass to Åk 9) or Gy22 (gymnasiet) for this subject and year.',
    '13. Swedish schools mostly have no bells. Never write "before the bell" or "innan det ringer" - say before the lesson starts.',

    ...stageRules(r.year_group),
    ...safetyRules(r.subject),
    '',
    'BE CONCISE. Every field earns its length. A substitute reads this standing up,',
    'and the whole plan has a hard output budget: a long \"summary\" is paid for by a',
    'missing task later. One or two sentences per prose field. Never pad.',
    '',
    'THE FIVE PHASES. "phases" has exactly these five, in this order, and they must match the',
    'content elsewhere in the JSON rather than describe it:',
    '  1 recap        - asks "recall.qs", nothing from this lesson',
    '  2 worked example - the substitute writes "model.st" on the board, saying each step',
    '  3 one together - the class does "model.tq" with the substitute',
    '  4 independent  - pupils work through "tasks"',
    '  5 exit         - "exit.q", written on a slip and handed in',
    '',
    'RECALL (Rosenshine 1). "recall.qs" are 2-3 questions on what pupils ALREADY know coming in,',
    'from earlier lessons or earlier years. Never a question this lesson is about to teach, and',
    'never the same question as the exit ticket. "recall.why" names what it builds on.',
    '',
    'THE WORKED EXAMPLE (Rosenshine 4) is the heart of the plan and is never optional.',
    '"model.p" is one problem. "model.st" is how to solve it, 3-5 steps, and each step carries',
    'BOTH what goes on the board ("b") and the words to say while writing it ("s") - so the',
    'substitute never has to invent either. "model.a" is the answer. "model.tq"/"model.ta" are',
    'a second, similar problem the class does WITH the substitute, with its answer.',
    'Never write a script line promising an example unless "model" contains one.',
    '',
    'MISCONCEPTIONS (EEF explicit instruction). One or two, no more. "t" is the wrong answer',
    'pupils actually give, in their words. "w" is why they give it. "s" is what the substitute',
    'says to fix it - a concrete check or picture, not "explain that it is wrong".',
    '',
    'NO REPEATS. The exit ticket, the recap questions, the worked example and the tasks are four',
    'different questions. An exit ticket identical to task 1 measures nothing.',
    '',
    'ANSWERS TRAVEL WITH QUESTIONS. Every "q" has its "a" beside it, every time. A substitute',
    'reading mid-lesson must never have to look elsewhere for an answer.',
    '',
    'PHASE BOARD. Each phase\'s "board" is what should be visible to pupils during that phase.',
    'For the worked example it is "model.st" joined by newlines; for independent work, the task',
    'list. It is what a projector would show.',
    '',
    'WHERE THINGS ARE. "equipment.where" says where the handouts and kit physically are in the',
    'room. A substitute cannot find the markers.',
    '',
    'THREE TIERS OF TASK, and all three are required. Every task carries a "tier":',
    '  support    2 tasks. The same goal, with the first step given, smaller numbers, or a',
    '             sentence starter. Reachable by a pupil who did not follow the explanation.',
    '  core       3 tasks. What most of the class does. These are the ones that go on the',
    '             board and on the printed handout.',
    '  extension  2 tasks. The same goal, asked harder: reverse the problem, apply it to a',
    '             real situation, or ask the pupil to justify. Never just more of the same.',
    'They are not three difficulties to choose between. All three are on the page at once,',
    'because thirty pupils need three levels in the same lesson and the person who can tell',
    'which pupil needs which is the substitute standing in the room.',
    'The tier is for the adult. Never write a tier name into a task a pupil reads.',
    'WRITE "tasks" BEFORE the long prose fields if you are running short: a plan without its',
    'tiers cannot be used at all, while a terse "handover" still works.',
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
    // With a term plan, "not specified" stops meaning "guess something safe".
    // The instruction changes with it: build on what the class has just done
    // rather than picking something self-contained, because a lesson that
    // follows on is the one the regular teacher would have taught.
    recentLines
      ? `Topic: ${(r.topic as string)?.trim() || 'Not specified - continue from what this class has just been taught, listed below.'}`
      : `Topic: ${(r.topic as string)?.trim() || 'Not specified - choose a self-contained topic from the central content that does not depend on the previous lesson.'}`,
    recentLines ? `What this class has been taught in the last few weeks, most recent last:\n${recentLines}` : '',
    (r.notes as string)?.trim() ? `Notes from the school: ${r.notes}` : '',
    r.lesson_type ? `Lesson type: ${r.lesson_type}` : '',
    // Difficulty and the substitute's subject knowledge used to be asked here.
    // Both are now answered inside the plan instead, by the person who can see
    // the class: the three task tiers and the depth switch. Asking a
    // coordinator to pick one level for thirty pupils was the wrong question.
    `Available in the room: ${Array.isArray(r.resources) && r.resources.length ? (r.resources as string[]).join(', ') : 'whiteboard, paper and pens only'}`,
  ].filter(Boolean).join('\n')

  return [{ role: 'system', content: system }, { role: 'user', content: user }]
}

/** Translate an existing plan instead of generating a second one. Cheaper, and
 *  the two languages stay the same lesson rather than two similar ones. */
export function buildTranslateMessages(plan: Record<string, unknown>, lang: string) {
  const target = lang === 'en' ? 'ENGLISH' : 'SWEDISH'
  return [
    {
      role: 'system',
      content:
        `You translate a school lesson plan into ${target}. ` +
        'Return ONLY the same JSON structure: identical keys, identical array lengths, identical order. ' +
        'Translate every string value into natural classroom language, not word for word. ' +
        'Leave unchanged: numbers, clock times like "08:20–08:35", maths expressions, answers that are only numbers, ' +
        'and anything on the board that is a diagram. Swedish schools have no bells: never write "bell". ' +
        'Do not add, remove or reorder anything. No commentary, no markdown fences.',
    },
    { role: 'user', content: JSON.stringify(plan) },
  ]
}

/** A teacher's own plan, pasted or uploaded, into LK's shape. Their lesson,
 *  their words: the model only sorts what is there into the fields. Anything
 *  the text does not say stays an empty string, so the editor can show the
 *  teacher exactly what is missing instead of hiding an invention in it. */
export function buildConvertMessages(text: string, r: Record<string, unknown>) {
  const ctx = [r.subject && `Subject: ${r.subject}`, r.year_group && `Year group: ${r.year_group}`,
               r.minutes && `Lesson length: ${r.minutes} minutes`].filter(Boolean).join('\n')
  return [
    {
      role: 'system',
      content: [
        'You turn a teacher\'s own lesson plan into JSON. It is their lesson: you sort, you do not write.',
        '',
        'OUTPUT one JSON object only, no markdown and no commentary, in exactly this shape:',
        SCHEMA,
        'plus one extra key: "gaps": string[] - short notes, in the teacher\'s language, on what the text did not cover.',
        '',
        'RULES',
        '1. Use the teacher\'s own wording wherever it fits. Keep their language (Swedish stays Swedish).',
        '2. Never invent content: no new tasks, answers, facts, examples or times that the text does not give.',
        '   If something is missing, leave that string empty ("") or that array empty ([]) and name it in "gaps".',
        '3. You MAY restructure: split a run of instructions into phases, pull the goal out of a sentence,',
        '   turn "write on the board: ..." into "board", turn numbered exercises into tasks.',
        '4. Phase times "t" only when the text gives durations; then as "00:00–00:10" from the lesson start.',
        '5. Task tier: "core" unless the text says the task is for pupils who need support or who finish early.',
        '6. Pupils are never named. If the text names a pupil, leave the name out and add a gap saying so.',
        '7. Never copy more than a short quotation from a textbook; describe it ("page 42, exercises 1-6") instead.',
      ].join('\n'),
    },
    { role: 'user', content: (ctx ? ctx + '\n\n' : '') + 'THE TEACHER\'S PLAN:\n' + text },
  ]
}

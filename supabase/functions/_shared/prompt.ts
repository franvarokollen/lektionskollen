// Prompt builder for turnkey substitute lesson plans.
// Shared by the browser (direct mode) and the Edge Function (Deno).

export type LessonRequest = {
  subject: string;
  yearGroup: string;          // e.g. "Åk 7", "Gy1"
  durationMinutes: number;
  topic?: string;             // optional – what the class is working on
  teacherNotes?: string;      // optional – from absent teacher / coordinator
  groupSize?: number;
  resources?: string[];       // e.g. ["projector", "whiteboard", "chromebooks"]
  language?: 'sv' | 'en';     // output language, Swedish is source of truth
};

const LANG_ANCHOR: Record<string, string> = {
  sv: 'OUTPUT LANGUAGE: SWEDISH. Every string value in the JSON MUST be written in Swedish. JSON keys stay in English exactly as specified.',
  en: 'OUTPUT LANGUAGE: ENGLISH. Every string value in the JSON MUST be written in English. JSON keys stay in English exactly as specified.',
};

export const PLAN_SCHEMA = `{
  "title": string,
  "subject": string,
  "yearGroup": string,
  "durationMinutes": number,
  "curriculumLink": string,            // which LGR22 / Gy22 central content this covers
  "learningGoal": string,              // one sentence, pupil-friendly
  "successCriteria": string[],         // 2-3 "I can..." statements
  "summaryForSubstitute": string,      // 2-3 sentences: what happens this lesson
  "boardLayout": string,               // exactly what to write on the board before pupils arrive
  "materials": [ { "item": string, "content": string } ],  // EVERY material fully written out in "content"
  "phases": [
    {
      "name": string,
      "minutes": number,
      "teacherScript": string,         // what the sub SAYS, in quotes
      "pupilActivity": string,
      "expectedResponses": string,     // likely answers incl. common errors and how to respond
      "checkQuestions": [ { "q": string, "a": string } ]   // no hands-up, cold-call style
    }
  ],
  "tasks": [ { "question": string, "answer": string } ],     // the actual task set with answers
  "differentiation": { "support": string, "extension": string },
  "earlyFinishers": string,
  "exitTicket": { "question": string, "answer": string },
  "classroomManagement": string[],     // practical tips for a stranger teaching this group
  "difficultSituations": [ { "situation": string, "response": string } ],  // example sub responses
  "handoverNote": string               // template note the sub leaves for the absent teacher
}`;

export function buildMessages(req: LessonRequest) {
  const lang = req.language ?? 'sv';

  const system = [
    LANG_ANCHOR[lang],
    '',
    'You write turnkey lesson plans for SUBSTITUTE teachers (vikarier) in Swedish schools.',
    'The substitute may have ZERO subject knowledge and has never met the class. They must be able to walk in and teach directly from your output.',
    '',
    'HARD RULES:',
    '1. No phantom references. Never mention a worksheet, text, word bank, video or resource unless you write its full content in "materials". If it is not written out, it does not exist.',
    '2. Embed everything: actual questions WITH answers, maths problems WITH worked solutions, readable texts written out in full.',
    '3. Exactly ONE lesson. No alternative versions, no "choose A or B".',
    '4. Script the teacher: put what the substitute says in quotes in "teacherScript".',
    '5. Anticipate pupils: likely answers, common misconceptions, and the recovery move for each.',
    '6. Check understanding without hands-up (cold call, mini-whiteboards, thumbs, exit ticket).',
    '7. Structure follows explicit instruction (Skolverket strukturerad undervisning / Rosenshine): review → goal → model → guided practice → independent practice → check/close.',
    '8. Phase minutes must add up to the lesson duration.',
    '9. Only assume resources that are listed as available.',
    '10. Align with Skolverket LGR22 (grundskola) or Gy22 (gymnasiet) for the given subject and year group.',
    '',
    'Respond with ONE JSON object only. No markdown, no code fences, no commentary. Use this shape:',
    PLAN_SCHEMA,
    '',
    LANG_ANCHOR[lang],
  ].join('\n');

  const user = [
    `Subject: ${req.subject}`,
    `Year group: ${req.yearGroup}`,
    `Lesson length: ${req.durationMinutes} minutes`,
    req.groupSize ? `Group size: ~${req.groupSize} pupils` : '',
    `Topic: ${req.topic?.trim() || 'Not specified – choose a sensible, self-contained topic from the central content for this year group that does not depend on the previous lesson.'}`,
    req.teacherNotes?.trim() ? `Notes from the school: ${req.teacherNotes.trim()}` : '',
    `Available resources: ${req.resources?.length ? req.resources.join(', ') : 'whiteboard, paper and pens only'}`,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

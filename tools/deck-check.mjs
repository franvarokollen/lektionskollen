// Does the projector ever show a pupil an answer?
//
// The deck is built from the plan's own fields, so it cannot invent anything -
// but it can reveal something. A worked example MUST show its completed
// solution; that is what makes it a worked example. Everything a pupil is
// meant to work out themselves must never reach a slide: the task answers, the
// exit answer, and the answer to the "one together" question the class has to
// attempt first.
//
// deckOf is read straight out of app/plan.html rather than copied, so this
// cannot pass against a stale duplicate of the function it is testing.
//
//   node tools/deck-check.mjs                 the built-in fixture
//   node tools/deck-check.mjs plan.json ...   bodies from lk_plan

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const page = readFileSync(new URL('../app/plan.html', import.meta.url), 'utf8');
const from = page.indexOf('  /** Is this text already on a slide');
const to = page.indexOf('  var DECK = null, DI = 0;');
if (from === -1 || to === -1 || to < from) {
  console.error('deck-check: could not find deckOf in app/plan.html');
  process.exit(2);
}
const dir = mkdtempSync(join(tmpdir(), 'lk-deck-'));
const mod = join(dir, 'deck.mjs');
writeFileSync(mod, page.slice(from, to).replace('function deckOf', 'export function deckOf')
  .replace('function deckScope', 'export function deckScope').replace('function deckAll', 'export function deckAll'));
const { deckOf, deckScope, deckAll } = await import(`file://${mod}`);

const L = { projModel: 'Worked example', projStep: 'Step', projTasks: 'Tasks', projExit: 'Before you go' };

// A plan carrying every trap at once: a worked example whose last step is the
// answer, a phase board that restates those steps, a phase board that is the
// task list written out, and an exit phase board equal to the exit question.
const FIXTURE = {
  title: 'Pythagoras sats', goal: 'Jag kan räkna ut hypotenusan.',
  board: 'Dagens mål', exit: { q: 'Kateter 6 och 8 — hur lång är hypotenusan?', a: '10 cm' },
  model: {
    p: 'Kateter 3 cm och 4 cm. Hur lång är hypotenusan?', a: '5 cm',
    tq: 'Kateter 5 och 12?', ta: '13 cm',
    st: [{ b: 'c² = a² + b²', s: 'Skriv formeln.' },
         { b: 'c² = 9 + 16 = 25', s: 'Kvadrera och addera.' },
         { b: 'c = 5 cm', s: 'Dra roten ur.' }],
  },
  tasks: [
    { q: 'Kateter 6 och 8. Hypotenusan?', a: '10 cm', tier: 'core' },
    { q: 'Kateter 9 och 12. Hypotenusan?', a: '15 cm', tier: 'core' },
    { q: 'Kateter 3 och 4?', a: '5 cm', tier: 'support' },
    { q: 'Hypotenusa 13, en katet 5. Den andra?', a: '12 cm', tier: 'extension' },
  ],
  phases: [
    { n: 'Repetition', board: 'Kvadrattal', checks: [{ q: 'Vad är 5²?', a: '25' }] },
    { n: 'Genomgång', board: 'c² = a² + b²\nc² = 9 + 16 = 25\nc = 5 cm', checks: [] },
    { n: 'Tillsammans', board: 'Kateter 5 och 12?', checks: [] },
    { n: 'Eget arbete', board: '1. Kateter 6 och 8. Hypotenusan?\n2. Kateter 9 och 12. Hypotenusan?', checks: [] },
    { n: 'Exit', board: 'Kateter 6 och 8 — hur lång är hypotenusan?', checks: [] },
  ],
};

const text = (s) => [s.h, s.pre, s.lead].concat(s.items || []).filter(Boolean).join('\n');

/* Checked by provenance, not by matching answer text.
 *
 * Matching strings looks right and is not: in the fixture below a support task
 * has the same answer as the worked example ("5 cm"), so the worked example's
 * own final step trips an answer-text check. That is a fault in a plan that
 * reuses its example as a task, not a fault in the deck.
 *
 * What the deck actually controls is WHICH FIELDS it reads. So the test is
 * that every string on every slide came from a field that is safe to project.
 * No answer field is on that list, which makes a leak impossible rather than
 * unobserved - and it cannot be fooled by a coincidence either way. */
function allowed(plan) {
  const ok = new Set();
  const add = (v) => { if (typeof v === 'string' && v.trim()) ok.add(v.trim()); };
  add(plan.title); add(plan.goal);
  add(plan.model?.p);
  for (const st of plan.model?.st || []) add(st.b);     // never st.s - that is the script
  for (const ph of plan.phases || []) { add(ph.n); add(ph.board); }
  for (const t of plan.tasks || []) add(t.q);           // never t.a
  add(plan.exit?.q);                                    // never exit.a
  for (const v of Object.values(L)) add(v);
  return ok;
}

function check(name, plan) {
  const slides = deckOf(plan, L);
  const fails = [];
  const ok = allowed(plan);

  slides.forEach((s, i) => {
    for (const v of [s.h, s.pre].concat(s.items || [])) {
      if (typeof v === 'string' && v.trim() && !ok.has(v.trim())) {
        fails.push(`slide ${i + 1} shows text from no safe field: "${v.slice(0, 60)}"`);
      }
    }
    // The goal rides along on the title slide, so its label is prefixed.
    if (s.lead && !ok.has(String(s.lead).trim())) {
      fails.push(`slide ${i + 1} lead text from no safe field`);
    }
    if (s.step && !ok.has(s.step.trim()) && !/^Step \d+$/.test(s.step)) {
      fails.push(`slide ${i + 1} label from no safe field: "${s.step}"`);
    }
  });

  // Navigation. A section button must land on that section, and the section
  // must end on a stop rather than run on into the next one.
  const phases = plan.phases || [];
  const whole = deckAll(plan, L);
  const covered = [];
  phases.forEach((ph, i) => {
    const sc = deckScope(plan, L, i);
    const body = sc.filter((x) => !x.end);
    if (!body.length) fails.push(`section ${i + 1} (${ph.n}) opens on nothing`);
    if (!sc[sc.length - 1].end) fails.push(`section ${i + 1} has no stop screen`);
    if (sc.filter((x) => x.end).length !== 1) fails.push(`section ${i + 1} has ${sc.filter((x) => x.end).length} stop screens`);
    if (body.some((x) => x.ph !== i)) fails.push(`section ${i + 1} shows another section's slide`);
    const nx = sc[sc.length - 1];
    if (i < phases.length - 1 && nx.nextPh !== i + 1) fails.push(`section ${i + 1} stop screen points at ${nx.nextPh}`);
    if (i === phases.length - 1 && nx.nextPh !== -1) fails.push('last section offers a next part');
    body.forEach((x) => covered.push(JSON.stringify(x)));
    if (!whole.some((x) => x.divider && x.ph === i)) fails.push(`whole lesson has no divider for section ${i + 1}`);
  });
  // Together the sections show every content slide exactly once (bar the title).
  const content = slides.filter((x) => x.ph >= 0);
  if (covered.length !== content.length || content.some((x) => !covered.includes(JSON.stringify(x)))) {
    fails.push(`sections cover ${covered.length} slides, the lesson has ${content.length}`);
  }
  // The whole lesson has the same content in the same order, dividers aside.
  const flat = whole.filter((x) => !x.divider);
  if (flat.length !== slides.length || flat.some((x, k) => JSON.stringify(x) !== JSON.stringify(slides[k]))) fails.push('whole lesson differs from the plain deck');
  // No answer-bearing field on the new screens either.
  for (const x of whole.filter((y) => y.divider)) if (!ok.has(String(x.h).trim())) fails.push(`divider text from no safe field: ${x.h}`);

  const seen = new Map();
  slides.forEach((s, i) => {
    const k = text(s).trim();
    if (seen.has(k)) fails.push(`slide ${i + 1} repeats slide ${seen.get(k) + 1}`);
    else seen.set(k, i);
  });

  const blob = JSON.stringify(slides);
  for (const t of ['support', 'core', 'extension']) {
    if (blob.includes(`"${t}"`)) fails.push(`a tier name reached a slide: ${t}`);
  }
  if (!slides.length) fails.push('no slides at all');

  console.log(`${fails.length ? '✕' : '✓'} ${name} — ${slides.length} slides, ` +
              `every string traced to a safe field`);
  for (const f of fails) console.log('    ' + f);
  return fails.length;
}

let bad = check('fixture', FIXTURE);
for (const f of process.argv.slice(2)) {
  const raw = JSON.parse(readFileSync(f, 'utf8'));
  bad += check(f, raw.body ?? raw);
}
console.log(bad ? '\nThe projector can show an answer. Fix it.' : '\nNo answer can reach a slide.');
process.exit(bad ? 1 : 0);

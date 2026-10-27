import type { Plan, Task } from './types';

/* ── The lesson, as slides ─────────────────────────────
   Built from the plan's own fields, so there is nothing to generate and
   nothing to get subtly wrong. A generated picture of a right-angled
   triangle with the legs mislabelled is worse than no picture, and you
   cannot check five hundred of them; a slide drawn from the data is correct
   by construction, costs nothing, and prints.

   The worked example is the reason this exists. It is the one part of a
   lesson that only works revealed a step at a time, and before this it was
   a block of text on a substitute's phone.

   What is NEVER on a slide: the worked example's final answer, a task
   answer, the exit ticket answer, a tier name. The class sees the questions;
   the adult keeps the answers. */


/** A slide, or one of the three screens that are not slides (divider, stop, end). */
export interface Slide {
  h?: string; pre?: string; lead?: string; step?: string; items?: string[];
  ph: number; pn: number;
  end?: boolean; divider?: boolean; nextPh?: number; nextName?: string;
}
/** The few labels a slide is built from, so the check script can pass just these. */
export interface DeckLabels { projModel: string; projStep: string; projTasks: string; projExit: string }

/** Is this text already on a slide, whole or in pieces? The generator
 *  repeats itself by design - a phase's board restates the worked example's
 *  steps, the exit phase's board is the exit question - and a deck that
 *  shows the same thing twice teaches a class to stop looking up. */
function already(S: Slide[], txt: string | undefined): boolean {
  if (!txt || !txt.trim()) return true;
  const t = txt.trim();
  return S.some(function (sl) {
    const hay = [sl.h, sl.pre].concat(sl.items || []).filter(Boolean).join('\n').trim();
    if (!hay) return false;
    if (hay.indexOf(t) !== -1) return true;
    // A board that is the task list written out: the questions are the same,
    // but the board numbers them ("1. ", "2. ") so neither string contains
    // the other. One question in common is enough to know.
    if (sl.items && sl.items.length && t.indexOf(sl.items[0]!) !== -1) return true;
    // A board built out of lines that are each already a slide of their own.
    return hay.length > 8 && t.indexOf(hay) !== -1;
  });
}

export function deckOf(p: Plan, l: DeckLabels): Slide[] {
  const S: Slide[] = [];
  const phases = p.phases || [];
  let cur = -1;
  // Every slide records which section it belongs to. Without that a section
  // button can only guess where to land, and guessed wrong (slide 1) whenever
  // dedup removed that section's board.
  const add = (sl: Partial<Slide>): void => { S.push({ ...sl, ph: cur, pn: phases.length }); };
  const push = (sl: Partial<Slide>): void => {
    const txt = sl.pre || sl.h;
    if (sl.items || !already(S, txt)) add(sl);
  };

  if (p.title) add({ h: p.title, lead: p.goal || '' });

  phases.forEach(function (ph, i) {
    cur = i;
    // Phase 2 is the worked example wherever it sits in the plan. Its steps
    // go up one at a time - the reason this is a deck and not a card.
    if (i === 1 && p.model && p.model.p) {
      push({ step: l.projModel, h: p.model.p });
      (p.model.st || []).forEach(function (st, j) {
        if (st && st.b) add({ step: l.projStep + ' ' + (j + 1), pre: st.b });
      });
      // p.model.a is deliberately absent: the answer is the substitute's.
    }

    // Phase 4 is independent work. The class copies the core tier; the tier
    // is not named on the slide any more than on a pupil's sheet.
    let core: Task[] = [];
    if (i === 3) {
      core = (p.tasks || []).filter((x) => (x.tier || 'core') === 'core');
      if (!core.length) core = (p.tasks || []);
    }
    // Tasks before this phase's board, deliberately: the generator writes
    // the same questions into both, and a numbered list reads better from
    // the back of a room than a copied-out block. Pushing it first lets
    // already() drop the board.
    for (let k = 0; k < core.length; k += 5) {
      add({ step: l.projTasks, items: core.slice(k, k + 5).map((x) => x.q) as string[] });
    }
    // The first section's board is a note about what the pupils should
    // already know ("Att eleverna kan..."), written for the adult, and in some
    // plans it states the answer to its own starter question. What the class
    // needs to see there is the questions. They are the plan's own check
    // questions - never the answers.
    const starters = i === 0 ? ((ph.checks || []).map((c) => c && c.q).filter(Boolean) as string[]) : [];
    if (starters.length) add({ step: ph.n, items: starters });
    else if (ph.board) push({ step: ph.n, pre: ph.board });
  });

  // The exit question belongs to the last section, so it is shown with it.
  if (p.exit && p.exit.q) { cur = Math.max(0, phases.length - 1); push({ step: l.projExit, h: p.exit.q }); }

  // A section whose board was a repeat of something already up still needs a
  // slide of its own, or its button has nowhere to land.
  phases.forEach(function (ph, i) {
    if (!S.some((sl) => sl.ph === i)) {
      let at = S.length;
      for (let k = 0; k < S.length; k++) { if (S[k].ph > i) { at = k; break; } }
      S.splice(at, 0, { step: ph.n, h: ph.n, ph: i, pn: phases.length });
    }
  });
  return S;
}

/** One section on its own: its slides, then a stop screen. The stop is the
 *  point - Next never runs on into the next section's slides, so the
 *  teacher has finished presenting before the class sees what comes next. */
export function deckScope(p: Plan, l: DeckLabels, i: number): Slide[] {
  const phases = p.phases || [];
  const out: Slide[] = deckOf(p, l).filter((sl) => sl.ph === i);
  const nx = phases[i + 1];
  out.push({ end: true, ph: i, pn: phases.length, nextPh: nx ? i + 1 : -1, nextName: nx ? nx.n : '' });
  return out;
}

/** The whole lesson, with a divider where each section begins. */
export function deckAll(p: Plan, l: DeckLabels): Slide[] {
  const phases = p.phases || [];
  const out: Slide[] = [];
  let last = -2;
  deckOf(p, l).forEach(function (sl) {
    if (sl.ph >= 0 && sl.ph !== last) {
      out.push({ divider: true, h: (phases[sl.ph] || {}).n || '', ph: sl.ph, pn: phases.length });
    }
    last = sl.ph;
    out.push(sl);
  });
  return out;
}


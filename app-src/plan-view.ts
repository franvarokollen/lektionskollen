// The plan, rendered once.
//
// There used to be two of these: the substitute's own page built one layout and
// vikarieView() in lk.js built another. They started the same and drifted, and
// the one that drifted was the one people actually looked at — the preview in
// the coordinator app, which is also what the FVK iframe renders. A plan was
// rebuilt around worked examples and misconceptions and the preview went on
// showing the old flat list of sections, with no sign that anything was stale.
//
// So there is one renderer and one stylesheet now. The two hosts differ only in
// what they wrap it in and what they hook into it.

import type { Phase, Plan, QA, Task, Tier } from './types';

/** Looks up a label. The hosts have different i18n systems, so this is the whole of the coupling. */
export type Labeller = (key: string) => string;
type Hook = (ref: string, label?: string) => string;

export interface RenderOpts {
  /** Required in practice; falls back to returning the key. */
  lbl?: Labeller;
  /**
   * Collapsing happens here, at read time, never at generation — one banked plan
   * serves every substitute. Answers survive every depth: brief hides the
   * script, never a fact.
   */
  depth?: 'full' | 'guided' | 'brief';
  /** For the live-assist buttons. */
  assistRow?: Hook;
  /** For anything generated mid-lesson. */
  extras?: Hook;
  /** For the coordinator's feedback heat. */
  flag?: Hook;
  /** True to offer "show this to the class" per phase. */
  projector?: boolean;
  /** False to leave out the help register (the host puts it in a margin rail instead). */
  help?: boolean;
  /**
   * True on the substitute's page: tick boxes, "done" buttons and the
   * short-version switch. The coordinator's preview leaves it off and shows the
   * same order without controls.
   */
  interactive?: boolean;
  /** True once the substitute has ticked it. */
  ready?: Partial<Record<'sheet' | 'board' | 'kit', boolean>>;
  /** Steps the substitute has finished, by phase index. */
  done?: Record<number, boolean>;
  /** True when the short version is switched on. */
  short?: boolean;
  /**
   * Render just this phase index, and nothing else. Teach mode shows one phase
   * at a time, and a phase has to keep its real index: phase 2 draws the worked
   * example and phase 4 the task list.
   */
  only?: number;
  /** Minutes to shift the plan's own clock onto the real lesson time. */
  shiftMin?: number;
}

export const esc = (s: unknown): string =>
  String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Phase order is the lesson's own sequence, so the colour is not decoration:
// recap, worked example, one together, independent, exit.
const KINDS = ['k-recall', 'k-model', 'k-together', 'k-indep', 'k-exit'];
export const kind = (i: number): string => KINDS[i] ?? 'k-indep';

const fill = (str: string | undefined, o: Record<string, string | number>): string =>
  String(str || '').replace(/\{(\w+)\}/g, (_m, k: string) => String(o[k]));

// Steps that a substitute short of time can leave out: the second recap
// question and the guided "one together" practice. The worked example, the
// pupils' own tasks and the exit question are what the lesson is for.
const SKIPPABLE: Record<number, boolean> = { 0: true, 2: true };

const noop = (): string => '';

export function render(plan?: Plan | null, opts?: RenderOpts): string {
  const p: Plan = plan || {};
  const o: RenderOpts = opts || {};
  const t: Labeller = o.lbl || ((k) => k);
  const depth = o.depth || 'full';
  const assistRow: Hook = o.assistRow || noop;
  const extras: Hook = o.extras || noop;
  const flag: Hook = o.flag || noop;
  const phases: Phase[] = p.phases || [];

  // A question and its answer, side by side. Separating them is the
  // split-attention effect: the reader holds one in working memory while
  // hunting for the other, and mid-lesson that is a scroll they cannot
  // afford. They used to be in different sections.
  function qa(q: string | undefined, a: string | undefined, num?: boolean): string {
    if (!q) return '';
    return '<div class="qa' + (num ? ' num' : '') + '">' +
      '<div class="q">' + esc(q) + '</div>' +
      '<div class="a"><b>' + esc(t('answer')) + '</b>' + esc(a || '') + '</div></div>';
  }

  // Double planning, made visible: what goes on the board and what to say
  // while writing it, so a substitute with no subject knowledge needs to
  // invent neither half.
  function modelBlock(m: Plan['model']): string {
    if (!m || !m.p) return '';
    return '<div class="model"><div class="model-p">' + esc(m.p) + '</div>' +
      '<div class="model-st model-lbl"><span>' + esc(t('modelWrite')) + '</span>' +
      '<span>' + esc(t('modelSay')) + '</span></div>' +
      (m.st || []).map((st) =>
        '<div class="model-st"><div class="model-b">' + esc(st.b || '') + '</div>' +
        '<div class="model-s">' + esc(st.s || '') + '</div></div>').join('') +
      '<div class="model-a">' + esc(t('modelAns')) + ': ' + esc(m.a || '') + '</div></div>';
  }

  // ── The three tiers, all on the page at once ───────────
  // The form used to ask the coordinator to pick one difficulty for the whole
  // class, in words ("Adapted", "Stretch") that mean nothing outside a
  // staffroom. Thirty pupils need three levels at the same moment, and the
  // person who can tell which pupil needs which is the one standing in the
  // room. So all three are here, each with its answers, and the substitute
  // points a pupil at the right one.
  //
  // The tier names are for the adult. A pupil's sheet never carries one.
  function tiers(tasks: Task[]): string {
    const order: Tier[] = ['support', 'core', 'extension'];
    const names: Record<Tier, string> = { support: 'tierSupport', core: 'tierStandard', extension: 'tierChallenge' };
    const groups = order
      .map((k) => ({ k, items: tasks.filter((x) => (x.tier || 'core') === k) }))
      .filter((g) => g.items.length);
    if (!groups.length) return '';
    const list = (items: QA[]): string =>
      '<div class="qalist">' + items.map((x) => qa(x.q, x.a, true)).join('') + '</div>';
    // One tier and no labels is the honest rendering of an untiered plan:
    // naming a level implies the others exist somewhere.
    const only = groups[0];
    if (groups.length === 1 && only) return list(only.items);
    return '<div class="tiers">' + groups.map((g) =>
      '<div class="tier t-' + g.k + '"><h5>' + esc(t(names[g.k])) + '</h5>' + list(g.items) + '</div>').join('') + '</div>' +
      '<p class="hint" style="margin:8px 0 0">' + esc(t('tierHint')) + '</p>';
  }

  // The first step that has not been ticked off.
  function firstOpen(): number {
    for (let k = 0; k < phases.length; k++) { if (!(o.done && o.done[k])) return k; }
    return -1;
  }

  // Shift the plan's own clock (it starts wherever it was written) onto the
  // real lesson time, when the page knows it: class links do.
  function clock(tt: string | undefined): string | undefined {
    const sh = o.shiftMin || 0;
    if (!sh || !tt) return tt;
    return String(tt).replace(/(\d{1,2}):(\d{2})/g, (_m, h: string, mi: string) => {
      const v = (((+h * 60 + +mi + sh) % 1440) + 1440) % 1440;
      return ('0' + Math.floor(v / 60)).slice(-2) + ':' + ('0' + (v % 60)).slice(-2);
    });
  }

  function phaseCard(ph: Phase, i: number): string {
    const ref = 'phase:' + i;
    const isModel = i === 1;
    const isDone = !!(o.done && o.done[i]);
    const isCur = !!o.interactive && !isDone && firstOpen() === i;
    const skip = !!(o.short && SKIPPABLE[i]);
    const stepTxt = fill(t('stepOf') || 'Step {i} of {n}', { i: i + 1, n: phases.length });
    // A finished step folds to one line, so the one that is still to do is
    // always the one on screen.
    if (isDone) {
      return '<div class="ph ' + kind(i) + ' ph-done" id="ph' + i + '">' +
        '<div class="ph-h"><span class="ph-n">&#10003;</span><strong>' + esc(ph.n) + '</strong>' +
        '<span class="ph-t">' + esc(clock(ph.t)) + '</span>' +
        '<button class="ph-re noprint" data-stepre="' + i + '">' + esc(t('stepReopen') || 'Reopen') + '</button></div></div>';
    }
    const next = phases[i + 1];
    return '<div class="ph ' + kind(i) + (isCur ? ' ph-cur' : '') + (skip ? ' ph-skip' : '') + '" id="ph' + i + '">' +
      '<div class="ph-step">' + esc(stepTxt) +
        (isCur ? ' · <b>' + esc(t('stepNow') || 'Now') + '</b>' : '') +
        (skip ? ' · <b class="canskip">' + esc(t('canSkip') || 'Can skip') + '</b>' : '') + '</div>' +
      '<div class="ph-h"><span class="ph-n">' + (i + 1) + '</span>' +
      '<strong>' + esc(ph.n) + '</strong>' + flag(ref) +
      '<span class="ph-t">' + esc(clock(ph.t)) + '</span></div>' +
      (depth === 'full' && ph.say
        ? '<div class="say"><em>' + esc(t('say')) + '</em>' + esc(ph.say) + '</div>' : '') +
      (isModel ? modelBlock(p.model) : '') +
      (i === 0 && p.recall && p.recall.why
        ? '<p class="meta"><b>' + esc(t('recallWhy')) + ':</b> ' + esc(p.recall.why) + '</p>' : '') +
      // The worked example already prints its own problem and answer; printing
      // the phase's check as well said the same thing twice.
      (isModel ? '' : (ph.checks || []).map((c) => qa(c.q, c.a)).join('')) +
      (i === 3 ? tiers(p.tasks || []) : '') +
      (depth !== 'brief' && ph.pupils
        ? '<p class="meta"><b>' + esc(t('pupils')) + '</b> ' + esc(ph.pupils) + '</p>' : '') +
      (depth === 'full' && ph.expect && ph.expect !== '—'
        ? '<p class="meta"><b>' + esc(t('expect')) + '</b> ' + esc(ph.expect) + '</p>' : '') +
      (o.projector && ph.board
        ? '<div class="strow noprint" style="margin-top:9px">' +
          '<button class="stbtn presentbtn" data-proj="' + i + '"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2" width="13" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6.5 4.6v3.8L10 6.5z" fill="currentColor"/><path d="M5 14h6M8 11v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' + esc(t('projBtn')) + '</button></div>' : '') +
      assistRow(ref, ph.n) + extras(ref) +
      '<div class="ph-foot">' +
        (next
          ? '<span class="nextup">' + esc(t('nextUp') || 'Next up:') + ' <b>' + esc(next.n) + '</b> · ' + esc(next.t) + '</span>'
          : '<span class="nextup">' + esc(t('lastStep') || 'Last step. Then: feedback.') + '</span>') +
        (o.interactive
          ? '<button class="stbtn pri noprint" data-stepdone="' + i + '">' + esc(t('stepDone') || 'Done – next step') + '</button>' : '') +
      '</div></div>';
  }

  if (typeof o.only === 'number') {
    const at = Math.max(0, Math.min(o.only, phases.length - 1));
    const pick = phases[at];
    return pick ? phaseCard(pick, o.only) : '';
  }

  let h = '';

  // ── 1. Get ready ───────────────────────────────────────
  // Everything the pupils will need comes first, because it has to exist
  // before the lesson starts: the sheet to print, the text for the board, the
  // kit. Each item is ticked off and folds to one line, so by the time the class
  // walks in the page is showing the lesson, not the preparation.
  const ready = o.ready || {};
  const mats = p.materials || [];
  function item(key: 'sheet' | 'board' | 'kit', title: string, bodyHtml: string): string {
    const done = !!ready[key];
    if (!o.interactive) {
      return '<div class="rd"><div class="rd-t"><b>' + esc(title) + '</b></div>' + bodyHtml + '</div>';
    }
    if (done) {
      return '<div class="rd rd-done"><div class="rd-t"><span class="rd-tick">&#10003;</span><b>' + esc(title) + '</b>' +
        '<button class="rd-btn noprint" data-ready="' + key + '">' + esc(t('readyShow') || 'Show again') + '</button></div></div>';
    }
    return '<div class="rd"><div class="rd-t"><span class="rd-tick rd-empty"></span><b>' + esc(title) + '</b>' +
      '<button class="rd-btn rd-ok noprint" data-ready="' + key + '">' + esc(t('readyDone') || 'Done – hide') + '</button></div>' + bodyHtml + '</div>';
  }
  const allReady = !!o.interactive && ready.sheet && ready.board && ready.kit;
  h += '<section class="reg reg-before" id="getready">' +
    '<div class="reg-h"><span class="n">1</span>' + esc(t('getReady') || 'Get ready') + '</div>' +
    '<p class="rd-goal"><b>' + esc(t('readyGoal') || 'The goal') + ':</b> ' + esc(p.goal) + '</p>' +
    item('board', t('readyBoard') || 'Write on the board', '<div class="board">' + esc(p.board) + '</div>') +
    (mats.length
      ? item('sheet', t('readySheet') || 'Pupil sheet',
          '<p class="rd-hint">' + esc(t('readySheetHint') || '') + '</p>' +
          (o.interactive
            ? '<div class="strow noprint"><button class="stbtn pri" data-student="lesson">' + esc(t('studentSheet') || 'Pupil sheet') + '</button></div>' : '') +
          mats.map((m) =>
            '<div class="mat"><h5>' + esc(m.h) + '</h5><div>' + esc(m.body) + '</div></div>').join('') +
          assistRow('tasks', t('tasks')) + extras('tasks'))
      : '') +
    item('kit', t('readyKit') || 'Gather',
      '<p class="rd-kit">' + esc(p.equipment && p.equipment.need) +
      '<br><span style="color:var(--ink-soft)">' + esc(p.equipment && p.equipment.fallback) + '</span></p>') +
    (allReady ? '<p class="rd-all">' + esc(t('readyAllDone') || '') + '</p>' : '') +
    '</section>';

  // ── 2. The first ninety seconds ────────────────────────
  const first90 = p.first90 || [];
  if (depth !== 'brief' && first90.length) {
    h += '<section class="reg reg-first">' +
      '<div class="reg-h"><span class="n">2</span>' + esc(t('first90') || 'The first 90 seconds') + '</div>' +
      '<ol class="f90">' + first90.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>' +
      (p.summary ? '<p class="rd-hint" style="margin:10px 0 0">' + esc(p.summary) + '</p>' : '') + '</section>';
  }

  // ── 3. The lesson ──────────────────────────────────────
  h += '<div class="lesson-h"><h2><span class="n">3</span>' + esc(t('theLesson')) + '</h2>' +
    (o.interactive
      ? '<button class="stbtn noprint' + (o.short ? ' on' : '') + '" data-short>' +
        esc(o.short ? (t('shortOff') || 'Show full') : (t('shortBtn') || 'Short on time?')) + '</button>' : '') + '</div>' +
    (o.short ? '<p class="shortnote">' + esc(t('shortNote') || '') + '</p>' : '') +
    phases.map(phaseCard).join('');

  const misc = p.misconceptions || [];
  if (misc.length) {
    h += '<section class="reg reg-plain">' +
      '<div class="reg-h reg-h-misc"><span class="n">!</span>' + esc(t('miscH')) + '</div>' +
      misc.map((m) =>
        '<div class="misc"><div class="t">' + esc(m.t) + '</div>' +
        (m.w ? '<div class="w">' + esc(t('miscWhy')) + ': ' + esc(m.w) + '</div>' : '') +
        '<div class="s"><b>' + esc(t('miscSay')) + '</b>' + esc(m.s) + '</div></div>').join('') + '</section>';
  }

  // ── Help ────────────────────────────────────────────
  // Last in the markup, but the hosts that can spare the width lift it into a
  // margin rail: it is needed at the moment there is no time to scroll.
  if (o.help !== false) h += help(p, t);

  return h;
}

/** Split out so a host can place it in a rail instead of in the flow. */
export function help(p: Plan, t: Labeller): string {
  return '<section class="reg reg-help">' +
    '<div class="reg-h"><span class="n">?</span>' + esc(t('ifWrong')) + '</div>' +
    '<div class="callout"><strong>' + esc(t('stuck')) + '</strong>' + esc(p.stuck) + '</div>' +
    '<div class="callout"><strong>' + esc(t('ahead')) + '</strong>' + esc(p.ahead) + '</div>' +
    '<div class="callout"><strong>' + esc(t('wrong')) + '</strong>' + esc(p.wrong) + '</div></section>' +
    (p.equipment && p.equipment.where
      ? '<div class="nav where" style="margin-top:14px"><b>' + esc(t('whereH')) + '</b>' +
        esc(p.equipment.where) + '</div>' : '');
}

/**
 * The closing sections. Separate because the two hosts follow them with
 * different things — ratings on the substitute's page, controls in the app.
 */
export function after(p: Plan, t: Labeller, extras?: Hook): string {
  return '<section class="reg reg-after">' +
    '<div class="reg-h"><span class="n">4</span>' + esc(t('afterH')) + '</div>' +
    '<p style="font-size:13px;white-space:pre-wrap">' + esc(p.handover) + '</p>' +
    (extras ? extras('lesson') : '') + '</section>';
}

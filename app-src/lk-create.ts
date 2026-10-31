// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
/* ── Create a lesson plan ─────────────────────────────────
   Lektionskollen does two things: it makes lesson plans, and it keeps a bank
   of them. This is the first half for a person, not for an absence: a
   teacher or coordinator sits down and makes a plan, three ways —

     AI        LK writes it from the subject, year, topic and the department's
               year plan (lk-generate reads the last weeks of it)
     upload    their own Word, PDF or pasted text, sorted into LK's shape by
               lk-generate's convert mode — sorted, never written
     scratch   an empty form

   All three end in the same editor with the same live check the approval
   uses, then one screen to approve and save. Whoever makes it says who they
   are: a qualified teacher in the subject approves at the top rung, so there
   is nothing to send on for approval. Labels follow from that — Teacher-made
   or AI-made, the name, and the rung.

   One screen per step, nothing on a screen that is not needed for that step. */
import { showScreen } from './lk';
import { APPROVER_KEY, APPR_ERR } from './lk-approve';
import { CATALOG_SUBJECTS, CATALOG_YEARS, subjectLabel, yearLabel } from './lk-catalog';
import { $, Lang, SHELL, TermRow, Verdict, esc, fillT, maybe$, sb, state, t, toast } from './lk-core';
import { genErrText, invokeGen } from './lk-generate';
import { usePlan } from './lk-panel';
import { apprLevelName, apprStars, loadBank } from './lk-pool';
import { isoWeek } from './lk-term';
import { startWait, stopWait, waitHtml } from './lk-wait';
import { Plan } from './types';
type CrRole = 'coordinator' | 'teacher' | 'qualified';
type CrMethod = 'ai' | 'upload' | 'scratch';
export interface CrState {
  step: number; name: string; role: CrRole;
  subject: string; year: string; minutes: number; topic: string; notes: string; lang: Lang;
  method: CrMethod | null; source: string; plan: Plan; mins: number[]; gaps: string[];
  model: string | null; check: Verdict | null; share: boolean; approve: boolean; busy: string;
  term: TermRow[] | null;
}
const CR_KEY = 'lk.creator';
const CR_RANK: Record<CrRole, number> = { coordinator: 1, teacher: 2, qualified: 3 };
let crTimer: number | undefined;

function crLoadWho(): { name: string; role: CrRole } {
  try {
    const v = JSON.parse(localStorage.getItem(CR_KEY) || '{}');
    const role: CrRole = v.role === 'coordinator' || v.role === 'qualified' ? v.role : 'teacher';
    return { name: String(v.name || localStorage.getItem(APPROVER_KEY) || ''), role };
  } catch { return { name: '', role: 'teacher' }; }
}

export function openCreate(subject?: string, year?: string) {
  const who = crLoadWho();
  state.cr = {
    step: who.name ? 2 : 1, name: who.name, role: who.role,
    subject: subject || state.pool.sub || CATALOG_SUBJECTS[0]!, year: year || state.pool.yr || 'Åk 7',
    minutes: 60, topic: '', notes: '', lang: 'sv', method: null, source: '', plan: {}, mins: [], gaps: [],
    model: null, check: null, share: false, approve: true, busy: '', term: null,
  };
  state.row = null; state.plan = null; state.planId = null;
  // In LK it is a page of its own; on the FVK test page it opens over the screen.
  if (SHELL === 'lk') { showScreen('create'); if (state.cr.step === 2) crLoadTerm(); return; }
  $('overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  $('seam-state').textContent = 'create';
  renderCreate();
  if (state.cr.step === 2) crLoadTerm();
}

const CR_STEPS = ['crStepYou', 'crStepLesson', 'crStepHow', 'crStepWrite', 'crStepSave'];

export function renderCreate() {
  const c = state.cr;
  if (!c) return;
  const steps = '<ol class="crsteps">' + CR_STEPS.map((k, i) =>
    '<li class="' + (i + 1 === c.step ? 'on' : i + 1 < c.step ? 'done' : '') + '"><span>' + (i + 1) + '</span>' + esc(t(k)) + '</li>').join('') + '</ol>';
  const body = c.busy ? crBusy() : c.step === 1 ? crYou() : c.step === 2 ? crLesson() : c.step === 3 ? crHow()
    : c.step === 4 ? crWrite() : crSave();
  const host = (SHELL === 'lk' && maybe$('create-page')) || $('addin-content');
  host.innerHTML =
    '<div class="addin-body crwiz">' +
      '<div class="addin-head"><div style="flex:1;min-width:0"><h2 id="addin-title">' + esc(t('crTitle')) + '</h2>' +
        '<div class="plan-meta">' + (c.step > 1 ? esc(c.name + ' · ' + t('crRole_' + c.role)) : esc(t('crLead'))) +
        (c.step > 2 ? ' · ' + esc(subjectLabel(c.subject) + ' · ' + yearLabel(c.year) + ' · ' + c.minutes + ' ' + t('min')) : '') + '</div></div>' +
        '<button class="x" data-close aria-label="✕">✕</button></div>' +
      steps + body +
    '</div>';
}

function crBusy() {
  return waitHtml(state.cr!.busy);
}

/* Step 1 — who is making it. Decides the approval rung, so it is asked plainly. */
function crYou() {
  const c = state.cr!;
  const role = (r: CrRole) =>
    '<button class="crcard' + (c.role === r ? ' on' : '') + '" data-crrole="' + r + '">' +
      apprStars(CR_RANK[r], '', true) + '<b>' + esc(t('crRole_' + r)) + '</b><span>' + esc(t('crRoleWhy_' + r)) + '</span></button>';
  return '<label class="f full">' + esc(t('crName')) + '<input id="cr-name" maxlength="80" autocomplete="name" value="' + esc(c.name) + '" placeholder="' + esc(t('apprNamePh')) + '"></label>' +
    '<div><div class="sect-h">' + esc(t('crWhoAreYou')) + '</div><div class="crcards">' + role('teacher') + role('qualified') + role('coordinator') + '</div>' +
    '<p class="hint">' + esc(t('crRoleNote')) + '</p></div>' +
    crFoot('', 'crNext', 'data-crnext');
}

/* Step 2 — the lesson, with the department's year plan next to it. */
function crLesson() {
  const c = state.cr!;
  const opt = (list: string[], cur: string, fmt: (s: string) => string) =>
    list.map((x) => '<option value="' + esc(x) + '"' + (x === cur ? ' selected' : '') + '>' + esc(fmt(x)) + '</option>').join('');
  const thisWeek = isoWeek(new Date());
  const rows = (c.term || []).filter((r) => r.topic).map((r) => ({ ...r, w: Number(r.week) }))
    .filter((r) => r.w >= thisWeek - 2 && r.w <= thisWeek + 3).sort((a, b) => a.w - b.w);
  const term = c.term === null ? '<p class="hint">' + esc(t('loading')) + '</p>'
    : rows.length ? '<div class="chips">' + rows.map((r) =>
        '<button class="tog' + (c.topic === r.topic ? ' on' : '') + '" data-crtopic="' + esc(String(r.topic)) + '" data-crnote="' + esc(String(r.note || '')) + '">' +
        esc(t('tpWeek')) + ' ' + r.w + (r.w === thisWeek ? ' ★' : '') + ' · ' + esc(String(r.topic)) + '</button>').join('') + '</div>'
    : '<p class="hint">' + esc(t('crNoTerm')) + '</p>';
  return '<div class="steer">' +
      '<label class="f">' + esc(t('subjectLbl')) + '<select id="cr-subject">' + opt(CATALOG_SUBJECTS, c.subject, subjectLabel) + '</select></label>' +
      '<label class="f">' + esc(t('yearLbl')) + '<select id="cr-year">' + opt(CATALOG_YEARS, c.year, yearLabel) + '</select></label>' +
      '<label class="f">' + esc(t('lengthLbl')) + '<select id="cr-min">' + [30, 40, 45, 50, 60, 70, 80, 90].map((m) =>
        '<option value="' + m + '"' + (m === c.minutes ? ' selected' : '') + '>' + m + ' ' + esc(t('min')) + '</option>').join('') + '</select></label>' +
      '<label class="f">' + esc(t('crLang')) + '<select id="cr-lang"><option value="sv"' + (c.lang === 'sv' ? ' selected' : '') + '>Svenska</option>' +
        '<option value="en"' + (c.lang === 'en' ? ' selected' : '') + '>English</option></select></label>' +
      '<label class="f full">' + esc(t('fTopic')) + '<input id="cr-topic" value="' + esc(c.topic) + '" placeholder="' + esc(t('fTopicPh')) + '"></label>' +
    '</div>' +
    '<div><div class="sect-h">' + esc(fillT('crTermH', { s: subjectLabel(c.subject), y: yearLabel(c.year) })) + '</div>' + term + '</div>' +
    crFoot('data-crback', 'crNext', 'data-crnext');
}

/* Step 3 — how. Three doors, same room behind them. */
function crHow() {
  const c = state.cr!;
  const card = (m: CrMethod, ico: string) =>
    '<button class="crcard big' + (c.method === m ? ' on' : '') + '" data-crmethod="' + m + '"><i>' + ico + '</i><b>' + esc(t('crM_' + m)) + '</b><span>' + esc(t('crMWhy_' + m)) + '</span></button>';
  let extra = '';
  if (c.method === 'ai') {
    extra = '<label class="f full">' + esc(t('fNotes')) + '<textarea id="cr-notes" rows="3" placeholder="' + esc(t('fNotesPh')) + '">' + esc(c.notes) + '</textarea></label>' +
      '<p class="hint">' + esc(t('crAiNote')) + '</p>';
  } else if (c.method === 'upload') {
    extra = '<div class="crdrop"><label class="btn btn-ghost">' + esc(t('crPickFile')) +
      '<input type="file" id="cr-file" accept=".docx,.pdf,.txt,.md,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden></label>' +
      '<span class="hint">' + esc(t('crFileKinds')) + '</span></div>' +
      '<label class="f full">' + esc(t('crPaste')) + '<textarea id="cr-source" rows="8" placeholder="' + esc(t('crPastePh')) + '">' + esc(c.source) + '</textarea></label>' +
      '<p class="hint">' + esc(t('crUploadNote')) + '</p>';
  }
  const go = c.method === 'ai' ? 'crGoAi' : c.method === 'upload' ? 'crGoUpload' : 'crGoScratch';
  return '<div class="crcards three">' + card('ai', '✦') + card('upload', '⇪') + card('scratch', '✎') + '</div>' + extra +
    crFoot('data-crback', go, c.method ? 'data-crgo' : 'disabled');
}

/* Step 4 — the editor, the same for all three. The check runs as they type. */
function crWrite() {
  const c = state.cr!; const p = c.plan;
  const inp = (path: string, label: string, val: unknown, ph = '', full = true) =>
    '<label class="f' + (full ? ' full' : '') + '">' + esc(label) + '<input data-cf="' + path + '" value="' + esc(String(val ?? '')) + '" placeholder="' + esc(ph) + '"></label>';
  const area = (path: string, label: string, val: unknown, rows = 2, ph = '') =>
    '<label class="f full">' + esc(label) + '<textarea data-cf="' + path + '" rows="' + rows + '" placeholder="' + esc(ph) + '">' + esc(String(val ?? '')) + '</textarea></label>';
  const lines = (path: string, label: string, val: string[] | undefined, ph = '') =>
    '<label class="f full">' + esc(label) + '<textarea data-cflines="' + path + '" rows="3" placeholder="' + esc(ph) + '">' + esc((val || []).join('\n')) + '</textarea></label>';
  const del = (path: string) => '<button class="crdel" data-crdel="' + path + '" title="' + esc(t('crRemove')) + '">✕</button>';
  const sec = (k: string, inner: string, open = true) =>
    '<details class="crsec"' + (open ? ' open' : '') + '><summary>' + esc(t(k)) + '</summary><div class="steer">' + inner + '</div></details>';

  const phases = (p.phases || []).map((ph, i) =>
    '<div class="crrow full"><div class="crrow-h"><b>' + (i + 1) + '</b>' +
      '<input data-cf="phases.' + i + '.n" value="' + esc(ph.n || '') + '" placeholder="' + esc(t('crPhaseName')) + '">' +
      '<input type="number" min="1" max="120" class="crmin" data-crmin="' + i + '" value="' + (c.mins[i] || '') + '"> ' + esc(t('min')) + del('phases.' + i) + '</div>' +
      '<textarea data-cf="phases.' + i + '.say" rows="2" placeholder="' + esc(t('crPhaseSay')) + '">' + esc(ph.say || '') + '</textarea>' +
      '<textarea data-cf="phases.' + i + '.pupils" rows="2" placeholder="' + esc(t('crPhasePupils')) + '">' + esc(ph.pupils || '') + '</textarea></div>').join('');
  const sum = c.mins.reduce((a, x) => a + (x || 0), 0);
  const tasks = (p.tasks || []).map((tk, i) =>
    '<div class="crrow full"><div class="crrow-h"><b>' + (i + 1) + '</b><select data-cf="tasks.' + i + '.tier">' +
      (['support', 'core', 'extension'] as const).map((tr) => '<option value="' + tr + '"' + ((tk.tier || 'core') === tr ? ' selected' : '') + '>' + esc(t('crTier_' + tr)) + '</option>').join('') +
      '</select>' + del('tasks.' + i) + '</div>' +
      '<textarea data-cf="tasks.' + i + '.q" rows="2" placeholder="' + esc(t('crTaskQ')) + '">' + esc(tk.q || '') + '</textarea>' +
      '<textarea data-cf="tasks.' + i + '.a" rows="1" placeholder="' + esc(t('crTaskA')) + '">' + esc(tk.a || '') + '</textarea></div>').join('');
  const m = p.model || {};
  const steps = (m.st || []).map((st, i) =>
    '<div class="crrow full"><div class="crrow-h"><b>' + (i + 1) + '</b>' +
      '<input data-cf="model.st.' + i + '.b" value="' + esc(st.b || '') + '" placeholder="' + esc(t('crStepB')) + '">' + del('model.st.' + i) + '</div>' +
      '<input data-cf="model.st.' + i + '.s" value="' + esc(st.s || '') + '" placeholder="' + esc(t('crStepS')) + '"></div>').join('');

  const gaps = c.gaps.length ? '<div class="flag" style="background:var(--warn-bg);color:#7c4a02"><span>!</span><div><b>' + esc(t('crGapsH')) + '</b><ul>' +
    c.gaps.map((g) => '<li>' + esc(g) + '</li>').join('') + '</ul></div></div>' : '';
  return gaps + crCheckBox() +
    sec('crSecBasics', inp('title', t('crPlanTitle'), p.title) + area('summary', t('crSummary'), p.summary, 2, t('crSummaryPh')) +
      inp('goal', t('goal'), p.goal, t('crGoalPh'))) +
    sec('crSecBefore', area('board', t('crBoard'), p.board, 3, t('crBoardPh')) +
      inp('equipment.need', t('crNeed'), p.equipment?.need, '', false) + inp('equipment.where', t('crWhere'), p.equipment?.where, '', false) +
      lines('first90', t('crFirst90'), p.first90, t('crFirst90Ph'))) +
    sec('crSecSteps', phases + '<div class="full crsum ' + (sum === c.minutes ? 'ok' : 'off') + '">' +
      esc(fillT('crSum', { a: sum, b: c.minutes })) + '</div><button class="btn btn-ghost btn-sm" data-cradd="phases">+ ' + esc(t('crAddPhase')) + '</button>') +
    sec('crSecModel', inp('model.p', t('crModelP'), m.p) + steps +
      '<button class="btn btn-ghost btn-sm full" data-cradd="model.st">+ ' + esc(t('crAddStep')) + '</button>' + inp('model.a', t('crModelA'), m.a), !!m.p) +
    sec('crSecTasks', '<p class="hint full">' + esc(t('crTiersNote')) + '</p>' + tasks +
      '<button class="btn btn-ghost btn-sm" data-cradd="tasks">+ ' + esc(t('crAddTask')) + '</button>') +
    sec('crSecEnd', inp('exit.q', t('crExitQ'), p.exit?.q) + inp('exit.a', t('crExitA'), p.exit?.a) +
      area('stuck', t('crStuck'), p.stuck, 1) + area('ahead', t('crAhead'), p.ahead, 1) + area('wrong', t('crWrong'), p.wrong, 1)) +
    crFoot('data-crback', 'crToSave', 'data-crnext');
}

function crCheckBox() {
  const v = state.cr!.check;
  if (!v) return '<div class="crcheck" id="cr-check"><span class="hint">' + esc(t('crChecking')) + '</span></div>';
  const bl = (v.problems || []).filter((x) => x.level === 'blocker');
  const wn = (v.problems || []).filter((x) => x.level !== 'blocker');
  return '<div class="crcheck ' + (bl.length ? 'bad' : 'ok') + '" id="cr-check"><b>' +
    esc(bl.length ? fillT('crBlockers', { n: bl.length }) : t('crReady')) + '</b>' +
    (bl.length ? '<ul>' + bl.map((x) => '<li>' + esc((x.where ? x.where + ': ' : '') + (x.detail || '')) + '</li>').join('') + '</ul>' : '') +
    (wn.length ? '<details><summary>' + esc(fillT('crWarnings', { n: wn.length })) + '</summary><ul>' +
      wn.map((x) => '<li>' + esc((x.where ? x.where + ': ' : '') + (x.detail || '')) + '</li>').join('') + '</ul></details>' : '') + '</div>';
}

/* Step 5 — approve and save, with the label it will carry spelled out. */
function crSave() {
  const c = state.cr!;
  const v = c.check;
  const blocked = !v || (v.blockers || 0) > 0;
  const origin = c.method === 'ai' ? 'ai' : 'teacher';
  const rank = CR_RANK[c.role];
  const label = '<div class="crlabel"><span class="orig ' + (origin === 'ai' ? 'ai' : 'tch') + '">' + esc(t(origin === 'ai' ? 'origAi' : 'origTeacher')) + '</span>' +
    (c.approve && !blocked ? apprStars(rank, c.name) + '<span>' + esc(fillT('crApprovedBy', { l: apprLevelName(rank), n: c.name })) + '</span>'
      : '<span class="chip chip-warn">' + esc(t('notApproved')) + '</span>') + '</div>';
  return '<div><div class="sect-h">' + esc(t('crLabelH')) + '</div>' + label + '</div>' +
    '<label class="sharetick"><input type="checkbox" data-crapprove' + (c.approve && !blocked ? ' checked' : '') + (blocked ? ' disabled' : '') + '>' +
      '<span><b>' + esc(fillT('crApproveAs', { l: apprLevelName(rank) })) + '</b><br><span class="hint">' +
      esc(blocked ? t('crCantApprove') : c.role === 'qualified' ? fillT('crApproveQual', { s: subjectLabel(c.subject) })
        : c.role === 'teacher' ? t('crApproveTeacher') : t('crApproveCoord')) + '</span></span></label>' +
    '<label class="sharetick"><input type="checkbox" data-crshare' + (c.share ? ' checked' : '') + '>' +
      '<span><b>' + esc(t('shareTitle')) + '</b><br><span class="hint">' +
      esc(origin === 'teacher' ? t('crShareTeacher') : t('crShareAi')) + '</span></span></label>' +
    crFoot('data-crback', 'crSaveBtn', 'data-crsave');
}

function crFoot(back: string, nextKey: string, nextAttr: string) {
  return '<div class="foot">' + (back ? '<button class="btn btn-ghost" ' + back + '>← ' + esc(t('crBack')) + '</button>' : '') +
    '<span class="spacer"></span><button class="btn btn-ghost" data-close>' + esc(t('cancel')) + '</button>' +
    '<button class="btn btn-primary" ' + nextAttr + '>' + esc(t(nextKey)) + (nextKey === 'crSaveBtn' ? '' : ' →') + '</button></div>';
}

/* ── Wizard plumbing ── */
async function crLoadTerm() {
  const c = state.cr; if (!c) return;
  c.term = null;
  const { data } = await sb.rpc('lk_term_plan', { p_subject: c.subject, p_year: c.year });
  if (state.cr !== c) return;
  c.term = (data || []) as TermRow[];
  if (c.step === 2) renderCreate();
}

function crReadStep() {
  const c = state.cr!;
  const v = (id: string) => maybe$<HTMLInputElement>(id)?.value;
  if (c.step === 1) c.name = (v('cr-name') || '').trim();
  if (c.step === 2) {
    c.subject = v('cr-subject') || c.subject; c.year = v('cr-year') || c.year;
    c.minutes = Number(v('cr-min')) || c.minutes; c.topic = v('cr-topic') || '';
    c.lang = v('cr-lang') === 'en' ? 'en' : 'sv';
  }
  if (c.step === 3) { c.notes = v('cr-notes') ?? c.notes; c.source = v('cr-source') ?? c.source; }
}

function crRemember() {
  const c = state.cr!;
  try { localStorage.setItem(CR_KEY, JSON.stringify({ name: c.name, role: c.role })); localStorage.setItem(APPROVER_KEY, c.name); } catch { /* private window */ }
}

/** Phase minutes from "00:05–00:15", so an AI or converted plan opens with them filled. */
function crMinsOf(p: Plan) {
  return (p.phases || []).map((ph) => {
    const m = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/.exec(ph.t || '');
    return m ? Math.max(0, (+m[3]! * 60 + +m[4]!) - (+m[1]! * 60 + +m[2]!)) : 0;
  });
}
/** And back: the plan's own clock, from the minutes. */
function crSetTimes() {
  const c = state.cr!; let at = 0;
  const hhmm = (n: number) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  (c.plan.phases || []).forEach((ph, i) => { const d = c.mins[i] || 0; ph.t = hhmm(at) + '–' + hhmm(at + d); at += d; });
}

function crBlank(): Plan {
  const c = state.cr!;
  // The independent-work step takes whatever is left, so the steps always
  // add up to the lesson (a 30-minute lesson used to start one minute over).
  const fixed = c.minutes >= 50 ? [5, 10, 10, 5, 5] : [4, 6, 6, 4];
  const rest = Math.max(1, c.minutes - fixed.reduce((a, x) => a + x, 0));
  const split = [...fixed.slice(0, 3), rest, ...fixed.slice(3)];
  c.mins = split;
  // Headings in the plan's language, not the screen's.
  const names = c.lang === 'en' ? ['Recap', 'Worked example', 'One together', 'Independent work', 'Exit question', 'Round off']
    : ['Repetition', 'Genomgång med exempel', 'Ett tillsammans', 'Eget arbete', 'Exit-fråga', 'Avslutning'];
  return {
    title: c.topic || '', goal: '', summary: '', board: '', first90: [], equipment: { need: '', where: '' },
    phases: split.map((_, i) => ({ n: names[i] || '', say: '', pupils: '' })),
    tasks: [{ tier: 'support', q: '', a: '' }, { tier: 'core', q: '', a: '' }, { tier: 'extension', q: '', a: '' }],
    exit: { q: '', a: '' }, stuck: '', ahead: '', wrong: '',
  };
}

function crRequest() {
  const c = state.cr!;
  return { subject: c.subject, year_group: c.year, minutes: c.minutes, topic: c.topic, notes: c.notes,
    lesson_type: '', resources: [], language: c.lang, group_name: null };
}

async function crGo() {
  const c = state.cr!;
  crReadStep();
  if (c.method === 'scratch') { c.plan = crBlank(); crSetTimes(); c.gaps = []; c.model = null; return crToWrite(); }
  if (c.method === 'upload' && !c.source.trim()) { toast(t('crNeedText')); return; }
  c.busy = t(c.method === 'ai' ? 'crBusyAi' : 'crBusyUpload'); renderCreate(); startWait();
  const body = c.method === 'ai' ? { request: crRequest() } : { request: crRequest(), convert: { text: c.source } };
  const { data, error } = await invokeGen(body);
  if (state.cr !== c) return;   // closed while it was writing
  stopWait();
  c.busy = '';
  if (error || !data || data.error || !data.plan) {
    toast(data?.error === 'empty_text' ? t('crNeedText') : genErrText(data, error), 8000);
    renderCreate(); return;
  }
  const plan = data.plan as Plan & { gaps?: string[] };
  c.gaps = Array.isArray(plan.gaps) ? plan.gaps.map(String) : [];
  delete plan.gaps;
  c.plan = plan; c.model = data.model || null; c.mins = crMinsOf(plan);
  if (!c.plan.phases?.length) { c.plan.phases = [{ n: '', say: '', pupils: '' }]; c.mins = [c.minutes]; }
  crSetTimes();
  crToWrite();
}

function crToWrite() {
  const c = state.cr!;
  c.step = 4; c.check = null;
  c.share = c.method === 'ai' ? state.shareAi !== false : false;
  renderCreate(); crCheck();
}

function crCheck() {
  clearTimeout(crTimer);
  crTimer = window.setTimeout(async () => {
    const c = state.cr; if (!c) return;
    const { data } = await sb.rpc('lk_check_plan', { p_body: c.plan, p_minutes: c.minutes, p_language: c.lang });
    if (state.cr !== c) return;
    c.check = (data || null) as Verdict | null;
    const box = maybe$('cr-check');
    if (box && c.step === 4) box.outerHTML = crCheckBox();
    else if (c.step === 5) renderCreate();
  }, 600);
}

/** "phases.2.say" → set on the plan, making objects and arrays as it goes. */
function crSet(path: string, val: unknown) {
  const keys = path.split('.');
  let o: any = state.cr!.plan;
  keys.slice(0, -1).forEach((k, i) => {
    const nextIsIdx = /^\d+$/.test(keys[i + 1]!);
    if (o[k] == null) o[k] = nextIsIdx ? [] : {};
    o = o[k];
  });
  o[keys[keys.length - 1]!] = val;
}
function crGet(path: string): any {
  return path.split('.').reduce((o: any, k) => (o == null ? o : o[k]), state.cr!.plan);
}

async function crExtract(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const load = (src: string) => new Promise<void>((ok, bad) => {
    if (document.querySelector('script[src="' + src + '"]')) return ok();
    const s = document.createElement('script'); s.src = src; s.onload = () => ok(); s.onerror = () => bad(new Error('load')); document.head.appendChild(s);
  });
  const w = window as any;
  if (name.endsWith('.docx')) {
    await load('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js');
    const r = await w.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return String(r.value || '');
  }
  if (name.endsWith('.pdf')) {
    await load('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');
    w.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    // Text only, and eval off: pdf.js 3.x can run font code through eval (CVE-2024-4367).
    const pdf = await w.pdfjsLib.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
    let out = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
      const pg = await pdf.getPage(i); const tc = await pg.getTextContent();
      out += tc.items.map((x: any) => x.str + (x.hasEOL ? '\n' : ' ')).join('') + '\n\n';
    }
    return out;
  }
  return await file.text();
}

async function crSaveNow() {
  const c = state.cr!;
  const origin = c.method === 'ai' ? 'ai' : 'teacher';
  const approve = c.approve && !!c.check && (c.check.blockers || 0) === 0;
  c.busy = t('crSaving'); renderCreate();
  const { data: pid, error } = await sb.rpc('lk_save_own_plan', {
    p_request: crRequest(), p_plan: c.plan, p_origin: origin, p_author: c.name, p_share: c.share, p_model: c.model,
  });
  if (error || !pid) { c.busy = ''; renderCreate(); toast(error?.message || t('errNeedsDb'), 8000); return; }
  if (approve) {
    const { data: ap } = await sb.rpc('lk_approve_as', { p_id: pid, p_kind: c.role, p_subject: c.subject, p_name: c.name });
    if (ap && ap.ok === false) toast(t(APPR_ERR[ap.error] || 'errUnknown'));
    // The approval trigger reads the plan as it was; recompute sharing now.
    if (c.share) await sb.rpc('lk_set_plan_share', { p_id: pid, p_allow: true });
  }
  crRemember();
  const stillOpen = state.cr === c;
  state.cr = null;
  toast(t(approve ? 'crSavedApproved' : 'crSavedDraft'));
  loadBank();
  if (stillOpen) await usePlan(String(pid));
}

/** Clicks inside the wizard. Returns true when it handled one. */
export async function crClick(tg: HTMLElement): Promise<boolean> {
  const c = state.cr;
  const open = tg.closest<HTMLElement>('[data-create]');
  if (open) { const [s, y] = (open.getAttribute('data-create') || '').split('|'); openCreate(s || undefined, y || undefined); return true; }
  if (!c) return false;
  const role = tg.closest<HTMLElement>('[data-crrole]');
  if (role) { crReadStep(); c.role = role.getAttribute('data-crrole') as CrRole; renderCreate(); return true; }
  const meth = tg.closest<HTMLElement>('[data-crmethod]');
  if (meth) { crReadStep(); c.method = meth.getAttribute('data-crmethod') as CrMethod; renderCreate(); return true; }
  const tp = tg.closest<HTMLElement>('[data-crtopic]');
  if (tp) {
    crReadStep(); c.topic = tp.getAttribute('data-crtopic') || '';
    const note = tp.getAttribute('data-crnote'); if (note) c.notes = note;
    renderCreate(); return true;
  }
  if (tg.closest('[data-crback]')) { crReadStep(); c.step = Math.max(1, c.step - 1); renderCreate(); return true; }
  if (tg.closest('[data-crnext]')) {
    crReadStep();
    if (c.step === 1 && c.name.length < 2) { toast(t('errName')); return true; }
    if (c.step === 1) crRemember();
    c.step++;
    renderCreate();
    if (c.step === 2) crLoadTerm();
    if (c.step === 5) crCheck();
    return true;
  }
  if (tg.closest('[data-crgo]')) { await crGo(); return true; }
  if (tg.closest('[data-crsave]')) { await crSaveNow(); return true; }
  const add = tg.closest<HTMLElement>('[data-cradd]');
  if (add) {
    const path = add.getAttribute('data-cradd')!;
    const list = (crGet(path) || []) as unknown[];
    list.push(path === 'phases' ? { n: '', say: '', pupils: '' } : path === 'tasks' ? { tier: 'core', q: '', a: '' } : { b: '', s: '' });
    crSet(path, list);
    if (path === 'phases') { c.mins.push(5); crSetTimes(); }
    renderCreate(); crCheck(); return true;
  }
  const dl = tg.closest<HTMLElement>('[data-crdel]');
  if (dl) {
    const path = dl.getAttribute('data-crdel')!;
    const i = Number(path.split('.').pop()); const listPath = path.split('.').slice(0, -1).join('.');
    (crGet(listPath) as unknown[]).splice(i, 1);
    if (listPath === 'phases') { c.mins.splice(i, 1); crSetTimes(); }
    renderCreate(); crCheck(); return true;
  }
  const ap = tg.closest<HTMLInputElement>('[data-crapprove]');
  if (ap) { c.approve = ap.checked; renderCreate(); return true; }
  const sh = tg.closest<HTMLInputElement>('[data-crshare]');
  if (sh) { c.share = sh.checked; return true; }
  return false;
}


/** Listeners this part of the page needs, registered where lk.ts always did. */
export function wireCreate() {
  /** Typing in the editor: straight into the plan, then a quiet re-check. */
  document.addEventListener('input', (e) => {
    const c = state.cr; if (!c) return;
    const el = e.target as HTMLInputElement;
    if (el.dataset.cf) { crSet(el.dataset.cf, el.value); if (el.dataset.cf === 'title' && !c.topic) c.topic = el.value; crCheck(); }
    else if (el.dataset.cflines) { crSet(el.dataset.cflines, el.value.split('\n').map((x) => x.trim()).filter(Boolean)); crCheck(); }
    else if (el.dataset.crmin !== undefined) {
      c.mins[Number(el.dataset.crmin)] = Math.max(0, Number(el.value) || 0); crSetTimes();
      const s = document.querySelector('.crsum'); const sum = c.mins.reduce((a, x) => a + (x || 0), 0);
      if (s) { s.textContent = fillT('crSum', { a: sum, b: c.minutes }); s.className = 'full crsum ' + (sum === c.minutes ? 'ok' : 'off'); }
      crCheck();
    }
  });
  document.addEventListener('change', async (e) => {
    const c = state.cr; if (!c) return;
    const el = e.target as HTMLInputElement;
    if (el.dataset.cf && el.tagName === 'SELECT') { crSet(el.dataset.cf, el.value); crCheck(); }
    if ((el.id === 'cr-subject' || el.id === 'cr-year') && c.step === 2) { crReadStep(); crLoadTerm(); }
    if (el.id === 'cr-file' && el.files && el.files[0]) {
      const f = el.files[0];
      try {
        const txt = await crExtract(f);
        c.source = txt.trim();
        const ta = maybe$<HTMLTextAreaElement>('cr-source'); if (ta) ta.value = c.source;
        toast(fillT('crFileRead', { f: f.name, n: c.source.length }));
      } catch { toast(t('crFileFail'), 8000); }
    }
  });


}


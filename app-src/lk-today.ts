/* ── Today (Lektionskollen on its own) ───────────────────
   Not a cover list: Lektionskollen on its own knows nothing about absences.
   This page shows which lesson plans are in use today, class by class, so

     - no class gets the same lesson twice (a plan already given to a class is
       never offered to that class again), and
     - the school can see where it is running low: for every lesson today it
       says how many unused plans that class has left in that subject.

   "Plan a lesson" picks a plan for one lesson: the school's own teacher-made
   plans first, then AI-made ones from the bank, and only when there is
   nothing left does it offer to create one. Schools should build their bank
   from their subject teachers; LK steps in when no teacher plan exists.

   Every use is stored in the database (plan_uses, through lk_log_run), so it
   is the same on every computer and feeds the feedback page. Inside
   Frånvarokollen this page is not shown: FVK's cover table does this job. */
import { CATALOG_SUBJECTS, CATALOG_YEARS, subjectLabel, yearLabel } from './lk-catalog';
import { BankRow, LANG, UseRow, esc, fillT, maybe$, sb, state, t, toast } from './lk-core';
import { openCreate } from './lk-create';
import { planUrl } from './lk-embed';
import { loadUses, usesOf } from './lk-pool';

interface Ask { subject: string; year: string; group: string; date: string; start: string; end: string; sub: string }

/** A day as the database stores it (YYYY-MM-DD), in the school's own time zone. */
const iso = (d: Date) => d.toLocaleDateString('sv-SE');
const today = () => iso(new Date());
/** The day `n` days after `day`. Noon, so a clock change never skips a day. */
function addDays(day: string, n: number) { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }
const fmtDay = (day: string, long = true) => new Date(day + 'T12:00:00').toLocaleDateString(LANG === 'sv' ? 'sv-SE' : 'en-GB',
  long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' });
let day = today();                        // the day on screen
const LOW = 1;   // this many unused plans left for a class, or fewer, is "running low"

let plans = new Map<string, BankRow>();   // every plan this school can use, by id
let all: BankRow[] = [];                  // the same, in lk_pool's ranked order
let ask: Ask | null = null;               // the Plan a lesson form, when open
let found = false;                        // the form has been searched
let busy = false;

/** Every plan the school may use, from its own bank and the shared pool. */
async function loadPlans() {
  const { data } = await sb.rpc('lk_pool', { p_subject: null, p_year: null, p_scope: 'all', p_approval: 'any' });
  all = (data || []) as BankRow[];
  plans = new Map(all.map((p) => [p.id, p]));
}

/** Load what the page needs, then draw it. */
export async function loadToday() {
  try { await Promise.all([loadPlans(), loadUses()]); } catch { /* drawn with what there is */ }
  renderToday();
}

const usesOn = (d: string) => state.uses.filter((u) => u.used_on === d)
  .sort((a, b) => (a.lesson_time || '99').localeCompare(b.lesson_time || '99'));

/** Approved plans for this subject and year that this class has not had,
 *  teacher-made first, then lk_pool's own ranking. */
function unused(subject: string, year: string, group: string) {
  const g = group.trim();
  const ok = all.filter((p) => p.approved && !p.approval_stale && p.subject === subject && p.year_group === year &&
    !(g && usesOf(p.id, g).length));
  return [...ok.filter((p) => p.origin === 'teacher'), ...ok.filter((p) => p.origin !== 'teacher')];
}

const originChip = (p: BankRow) => p.origin === 'teacher'
  ? '<span class="tdst ok">' + esc(t('origTeacher')) + (p.author_name ? ' · ' + esc(p.author_name) : '') + '</span>'
  : '<span class="tdst draft">' + esc(t('origAi')) + '</span>';

/** "3 more for 7B" — or a warning when the class is about to run out. */
function stockChip(subject: string, year: string, group: string) {
  const n = unused(subject, year, group).length;
  if (n > LOW) return '<span class="tdstock">' + esc(fillT('tdLeft', { n, g: group })) + '</span>';
  return '<span class="tdst warn">' + esc(n ? fillT('tdLow', { n, g: group }) : fillT('tdOut', { g: group })) + '</span>';
}

function useCard(u: UseRow) {
  const p = plans.get(u.plan_id);
  const [start = '', end = ''] = (u.lesson_time || '').split('–');
  const title = p ? (LANG !== p.language_alt ? p.title : p.title_alt || p.title) : t('tdGone');
  const what = [u.group_name, p ? subjectLabel(p.subject) : '', p ? yearLabel(p.year_group) : ''].filter(Boolean).join(' · ');
  const link = u.run_token ? planUrl('r:' + u.run_token) : p ? planUrl(p.share_token) : '';
  return '<article class="tdcard">' +
    '<div class="tdtime mono">' + esc(start || '—') + '<span>' + esc(end) + '</span></div>' +
    '<div class="tdmain">' +
      '<div class="tdtop"><b>' + esc(what) + '</b>' + (p ? originChip(p) : '') + '</div>' +
      '<p class="tdtitle">' + esc(title) + '</p>' +
      '<p class="tdmeta">' + [
        u.substitute ? esc(t('tdSubName')) + ': ' + esc(u.substitute) : '',
        p ? stockChip(p.subject, p.year_group, u.group_name) : '',
      ].filter(Boolean).join(' · ') + '</p>' +
    '</div>' +
    (link ? '<a class="btn btn-ghost btn-sm tdopen" href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(t('tdOpen')) + '</a>' : '') +
  '</article>';
}

function opt(v: string, lbl: string, on: boolean) {
  return '<option value="' + esc(v) + '"' + (on ? ' selected' : '') + '>' + esc(lbl) + '</option>';
}

function pickCard(p: BankRow) {
  const title = LANG !== p.language_alt ? p.title : p.title_alt || p.title;
  return '<div class="tdpick">' +
    '<div class="tdmain"><div class="tdtop"><b>' + esc(title) + '</b>' + originChip(p) + '</div>' +
      '<p class="tdmeta">' + [p.minutes ? p.minutes + ' min' : '', p.mine === false && p.school ? esc(p.school) : ''].filter(Boolean).join(' · ') + '</p></div>' +
    '<a class="btn btn-ghost btn-sm" href="' + esc(planUrl(p.share_token)) + '" target="_blank" rel="noopener">' + esc(t('tdPreview')) + '</a>' +
    '<button class="btn btn-primary btn-sm" data-tduse="' + esc(p.id) + '"' + (busy ? ' disabled' : '') + '>' + esc(t('tdUse')) + '</button>' +
  '</div>';
}

/** What the search found for the lesson in the form. */
function results(a: Ask) {
  const list = unused(a.subject, a.year, a.group);
  const own = list.filter((p) => p.origin === 'teacher');
  const lesson = esc(a.group) + ' · ' + esc(subjectLabel(a.subject)) + ' · ' + esc(yearLabel(a.year));
  const create = '<button class="btn btn-ghost btn-sm" data-tdcreate>' + esc(t('tdCreate')) + '</button>';
  if (!list.length) {
    return '<div class="tdres"><p class="tdempty"><b>' + esc(t('tdNoneLeft')) + '</b> ' + lesson + '</p>' +
      '<p class="hint">' + esc(t('tdAskTeacher')) + '</p><div class="tdactions">' + create + '</div></div>';
  }
  return '<div class="tdres">' +
    (own.length ? '' : '<p class="hint tdnoteach">' + esc(t('tdNoTeacher')) + '</p>') +
    list.slice(0, 3).map(pickCard).join('') +
    '<p class="hint">' + esc(list.length === 1 ? t('tdMore1') : fillT('tdMore', { n: list.length })) + ' ' + create + '</p>' +
  '</div>';
}

function form(a: Ask) {
  return '<div class="bcard fx tdform">' +
    '<h3>' + esc(t('tdPlanTitle')) + '</h3><p class="hint">' + esc(t('tdPlanLead')) + '</p>' +
    '<div class="tdgrid">' +
      '<label class="f">' + esc(t('tdSubject')) + '<select id="td-subject">' + CATALOG_SUBJECTS.map((s) => opt(s, subjectLabel(s), s === a.subject)).join('') + '</select></label>' +
      '<label class="f">' + esc(t('tdYear')) + '<select id="td-year">' + CATALOG_YEARS.map((y) => opt(y, yearLabel(y), y === a.year)).join('') + '</select></label>' +
      '<label class="f">' + esc(t('tdClass')) + '<input id="td-class" maxlength="40" placeholder="7B" value="' + esc(a.group) + '"></label>' +
      '<label class="f">' + esc(t('tdDate')) + '<input id="td-date" type="date" value="' + esc(a.date) + '"></label>' +
      '<label class="f">' + esc(t('tdStart')) + '<input id="td-start" type="time" value="' + esc(a.start) + '"></label>' +
      '<label class="f">' + esc(t('tdEnd')) + '<input id="td-end" type="time" value="' + esc(a.end) + '"></label>' +
      '<label class="f">' + esc(t('tdSub')) + '<input id="td-sub" maxlength="80" value="' + esc(a.sub) + '"></label>' +
    '</div>' +
    '<div class="foot"><span class="spacer"></span>' +
      '<button class="btn btn-ghost" data-tdcancel>' + esc(t('cancel')) + '</button>' +
      '<button class="btn btn-primary" data-tdfind>' + esc(t('tdFind')) + '</button></div>' +
    (found ? results(a) : '') +
  '</div>';
}

export function renderToday() {
  const host = maybe$('today-page');
  if (!host) return;
  const list = usesOn(day);
  const isToday = day === today();
  const low = list.filter((u) => { const p = plans.get(u.plan_id); return p && unused(p.subject, p.year_group, u.group_name).length <= LOW; }).length;
  const d = fmtDay(day);
  const head = isToday
    ? (!list.length ? t('tdNoneToday') : list.length === 1 ? t('tdInUse1') : fillT('tdInUse', { n: list.length }))
    : (!list.length ? fillT('tdNoneOn', { d }) : list.length === 1 ? fillT('tdOn1', { d }) : fillT('tdOn', { n: list.length, d }));
  const chip = (k: string, v: string) => '<button class="btn btn-ghost btn-sm' + (day === v ? ' on' : '') + '" data-tdday="' + v + '">' + esc(t(k)) + '</button>';
  host.innerHTML =
    '<div class="tdpicker">' +
      '<button class="btn btn-ghost btn-sm" data-tdday="' + addDays(day, -1) + '" aria-label="' + esc(t('tdPrev')) + '" title="' + esc(t('tdPrev')) + '">‹</button>' +
      '<input id="td-day" type="date" value="' + esc(day) + '" aria-label="' + esc(t('tdDate')) + '">' +
      '<button class="btn btn-ghost btn-sm" data-tdday="' + addDays(day, 1) + '" aria-label="' + esc(t('tdNextDay')) + '" title="' + esc(t('tdNextDay')) + '">›</button>' +
      chip('tdToday', today()) + chip('tdTomorrow', addDays(today(), 1)) +
      // Next Monday: the start of next week, never today.
      chip('tdNextWeek', addDays(today(), ((8 - new Date().getDay()) % 7) || 7)) +
    '</div>' +
    '<div class="tdhead card-elevated">' +
      '<div class="tdsum"><p class="tdkicker">' + esc(d) + (day < today() ? ' · ' + esc(t('tdPast')) : '') + '</p>' +
        '<h2>' + esc(head) + '</h2>' +
        '<p class="hint" style="margin:0">' + esc(!low ? t('tdLead') : low === 1 ? t('tdLowSum1') : fillT('tdLowSum', { n: low })) + '</p></div>' +
      '<div class="tdactions"><button class="btn btn-primary" data-tdplan>' + esc(t('tdPlan')) + '</button></div>' +
    '</div>' +
    (ask ? form(ask) : '') +
    '<div class="tdlist">' + list.map(useCard).join('') + '</div>';
}

/** Read the form back into `ask`. */
function readForm(): Ask | null {
  const v = (id: string) => (maybe$<HTMLInputElement>(id)?.value || '').trim();
  return { subject: v('td-subject'), year: v('td-year'), group: v('td-class'), date: v('td-date') || day, start: v('td-start'), end: v('td-end'), sub: v('td-sub') };
}

function valid(a: Ask) {
  if (!a.group) { toast(t('tdNeedClass')); maybe$('td-class')?.focus(); return false; }
  const m = (s: string) => { const [h = 0, mm = 0] = s.split(':').map(Number); return h * 60 + mm; };
  if (a.start && a.end && m(a.end) <= m(a.start)) { toast(t('tdBadTime')); return false; }
  return true;
}

async function use(planId: string) {
  const a = readForm();
  if (!a || !valid(a)) return;
  busy = true; renderToday();
  try {
    const { data, error } = await sb.rpc('lk_log_run', {
      p_plan_id: planId, p_group: a.group, p_substitute: a.sub || null, p_on: a.date,
      p_time: a.start ? a.start + (a.end ? '–' + a.end : '') : null,
    });
    if (error || !data) { toast(error?.message || t('tdUseFail')); return; }
    toast(fillT('tdUsed', { g: a.group, d: fmtDay(a.date, false) }));
    ask = null; found = false; day = a.date;   // show the day it went to
    await loadUses();
  } finally { busy = false; renderToday(); }
}

/** Clicks on the Today page. Returns true when it handled one. */
export function todayClick(tg: HTMLElement): boolean {
  if (tg.closest('[data-tdplan]')) {
    const hr = new Date().getHours();
    ask = ask || { subject: CATALOG_SUBJECTS[0]!, year: 'Åk 7', group: '', date: day, start: String(Math.min(hr + 1, 16)).padStart(2, '0') + ':00', end: '', sub: '' };
    found = false; renderToday(); maybe$('td-class')?.focus();
    return true;
  }
  const dd = tg.closest<HTMLElement>('[data-tdday]');
  if (dd) { setDay(dd.getAttribute('data-tdday')!); return true; }
  if (tg.closest('[data-tdcancel]')) { ask = null; found = false; renderToday(); return true; }
  if (tg.closest('[data-tdfind]')) {
    const a = readForm();
    if (a && valid(a)) { ask = a; found = true; renderToday(); }
    return true;
  }
  const u = tg.closest<HTMLElement>('[data-tduse]');
  if (u) { use(u.getAttribute('data-tduse')!); return true; }
  if (tg.closest('[data-tdcreate]')) {
    const a = readForm() || ask;
    state.back = 'today';
    openCreate(a?.subject, a?.year);
    return true;
  }
  return false;
}

/** Show another day. The open form follows it, unless its date was changed by hand. */
function setDay(d: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
  if (ask) { const a = readForm(); if (a) ask = { ...a, date: a.date === day ? d : a.date }; }
  day = d; found = false;
  renderToday();
}

/** The date field: change events do not bubble to the click handler. */
document.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement | null;
  if (el && el.id === 'td-day' && el.value) setDay(el.value);
});

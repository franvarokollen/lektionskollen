// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
/* ── Bank ──────────────────────────────────────────── */
import { CATALOG_SUBJECTS, CATALOG_YEARS, canonSubject, canonYear, subjectLabel, yearLabel } from './lk-catalog';
import { $, BankRow, CHK, LANG, PoolPick, UseRow, esc, fillT, maybe$, sb, state, t } from './lk-core';
export let bankReady: Promise<void> = Promise.resolve();
let bankSeq = 0;
/** The bank's first load; openEmbed waits on it. */
export function startBank() { bankReady = loadBank(); }
export async function loadBank() {
  const seq = ++bankSeq;
  const scope = $<HTMLSelectElement>('f-scope').value || 'all';
  const approval = $<HTMLSelectElement>('f-approval').value || 'any';
  const origin = $<HTMLSelectElement>('f-origin').value || 'any';
  // lk_pool rather than lk_bank_ranked: same ranking, plus what kind of
  // approval each plan carries and whether that approval still matches the
  // body it was given to.
  const args: Record<string, string | null> = { p_subject: null, p_year: null, p_scope: scope, p_approval: approval };
  if (origin !== 'any') args.p_origin = origin;
  const { data, error } = await sb.rpc('lk_pool', args);
  if (seq !== bankSeq) return;   // a newer filter change is already on its way
  if (error) { $('bankgrid').innerHTML = '<p class="note">' + esc(t('errBank')) + ' ' + esc(error.message) + '</p>'; return; }
  state.bank = data || [];
  fillFilterOptions();
  renderBank();
}

export function fillFilterOptions() {
  // Subject and year group are picked on the shelf itself (rail and chips),
  // so only the two filters that cut across every shelf stay as dropdowns.
  // Fixed options: rebuilding them mid-load would drop a choice made while loading.
  const fixed = (el: HTMLSelectElement, want: string[][]) => {
    const cur = el.value || want[0]![0]!;
    if (el.options.length !== want.length || el.options[0]?.text !== want[0]![1]) {
      el.innerHTML = want.map(([v, l]) => '<option value="' + v + '">' + esc(l) + '</option>').join('');
      el.value = cur;
    }
  };
  fixed($<HTMLSelectElement>('f-scope'), [['all', t('allSources')], ['mine', t('ourSchool')], ['shared', t('sharedOnly')]]);
  // Shown once the database reports origin (20261028a); an older one would
  // reject the filter.
  if (state.bank.some((b) => b.origin)) state.hasOrigin = true;
  $('f-origin').hidden = !state.hasOrigin;
  fixed($<HTMLSelectElement>('f-origin'), [['any', t('filtAnyOrigin')], ['ai', t('filtAi')], ['teacher', t('filtTeacherMade')]]);
  fixed($<HTMLSelectElement>('f-approval'), [['any', t('filtAnyAppr')], ['approved', t('filtApproved')],
                          ['teacher', t('filtTeacher')], ['qualified', t('filtQualified')]]);
}

/** A bank row's title in the reader's language, else the one it has. */
export function rowTitle(b: BankRow) {
  if (b.language_alt === LANG && b.title_alt) return b.title_alt;
  return b.title;
}

export function stars(r: unknown) {
  const n = Math.round(Number(r) || 0);
  return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
}

/** The year group as a number, so Ak 10 sorts after Ak 9 rather than after
 *  Ak 1. Anything with no number in it goes last, alphabetically. */
export function yearNum(y: unknown) {
  if (String(y || '').trim() === 'F') return 0;
  const m = /(\d+)/.exec(String(y || ''));
  return m ? Number(m[1]) : Infinity;
}

/** Accent colors for the subject sections, so a long pool reads as subjects
 *  rather than as a wall of identical cards. Assigned by position in the
 *  sorted list (not hashed off the name) so that two subjects next to each
 *  other never land on the same color — which a hash cannot promise and a
 *  scrolling coordinator would read as a mistake. */
const SUBJECT_PALETTE = [
  '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d', '#ea580c', '#4f46e5',
];

/* ── The approval ladder ─────────────────────────────────
   0 unconfirmed, 1 coordinator, 2 teacher, 3 qualified teacher. The database
   decides the rung (live_rank, which already drops it to 0 if the plan changed
   after it was signed); this only draws it. */
export const APPR_MAX = 3;
export function apprLevelName(n: number) { return t('apLvl' + n); }

/** Stars and a number: how far up the ladder a plan has been signed off. It is
 *  not the substitutes' score, which stays a number out of 100 beside it. */
export function apprStars(rank: unknown, who?: string, bare?: boolean) {
  const n = Math.max(0, Math.min(APPR_MAX, Number(rank) || 0));
  const tip = fillT('apLevel', { n: n, l: apprLevelName(n) }) + (who ? ' · ' + who : '');
  let s = '';
  for (let i = 1; i <= APPR_MAX; i++) s += '<i class="' + (i <= n ? 'on' : 'off') + '">★</i>';
  return '<span class="apstars r' + n + '" role="img" aria-label="' + esc(tip) + '" title="' + esc(tip) + '">' +
    s + (bare ? '' : '<b>' + n + '/' + APPR_MAX + '</b>') + '</span>';
}

/** One card — deliberately small. A coordinator scans a shelf of these, not
 *  one at a time: the card's job is "which plan, is it ready, click it",
 *  everything else (the full score breakdown, the why-shared checklist) is
 *  one click away on the plan itself. The whole card opens it; only the
 *  copy-link button is its own target. */
function bankCard(b: BankRow, withYear?: boolean) {
  const st = b.st || {};
  const sc = st.score != null ? Math.round(st.score * 100) : null;
  const n = st.n || 0;
  // A rung that no longer matches the plan is worth nothing, so the database
  // already reports it as 0 once the body has changed since it was signed.
  const rank = b.approved ? (Number(b.approval_rank) || 0) : 0;
  const who = [b.approved_name, rank >= 2 && b.approved_subject ? subjectLabel(b.approved_subject) : '']
    .filter(Boolean).join(', ');
  const status = apprStars(rank, who) +
    (!b.approved ? '<span class="chip chip-warn">' + esc(t('notApproved')) + '</span>'
     : b.approval_stale ? '<span class="chip chip-warn">' + esc(t('chipStale')) + '</span>'
     : '<span class="aplvl">' + esc(apprLevelName(rank)) + '</span>');
  const score = !b.approved ? ''
    : n ? '<span class="pc-score ' + (sc! >= 75 ? 'hi' : sc! >= 55 ? 'mid' : sc! >= 40 ? 'lo' : 'bad') + '">' + sc + '</span>' +
          '<span class="pc-n">' + esc(fillT(n === 1 ? 'scOne' : 'scMany', { n: n })) + '</span>'
      : '<span class="pc-new">' + esc(t('scNew')) + '</span>';
  return '<div class="bcard pcard clickable" data-viewplan="' + b.id + '">' +
    '<div class="pc-head"><h4>' + esc(rowTitle(b)) + '</h4>' +
      (b.approved ? '<button class="pc-copy" data-copylink="' + esc(b.share_token) + '" title="' + esc(t('copyLink')) + '">' + CHK + '</button>' : '') +
    '</div>' +
    originLine(b) +
    '<p class="pc-meta">' + (withYear ? '<span class="pc-yr">' + esc(yearLabel(b.year_group)) + '</span> · ' : '') +
      b.minutes + ' ' + esc(t('min')) +
      (b.mine ? '' : ' · ' + esc(b.school || '')) + '</p>' +
    '<div class="pc-status">' + status + score + '</div>' +
    usedLine(b.id) +
  '</div>';
}

/** "AI-made" or "Teacher-made · Anna L", plus "School only" on our own
 *  approved plans that are not allowed to leave the school. Nothing on an
 *  older database that does not report origin. */
function originLine(b: BankRow) {
  if (!b.origin) return '';
  const tch = b.origin === 'teacher';
  return '<p class="pc-orig"><span class="orig ' + (tch ? 'tch' : 'ai') + '">' + esc(t(tch ? 'origTeacher' : 'origAi')) + '</span>' +
    (tch && b.author_name ? '<span class="muted">' + esc(b.author_name) + '</span>' : '') +
    (b.mine && b.share_allowed === false ? '<span class="orig loc">' + esc(t('localOnly')) + '</span>' : '') + '</p>';
}

/* ── The pool ────────────────────────────────────────────
   One shelf at a time. The pool used to be every subject and every year group
   on one long page — fine at thirty plans, a wall at three hundred, and F to
   Åk 9 in every subject gets there. Nobody arrives wanting all of it: a
   teacher wants their subject, a coordinator covering maths for Åk 8 wants
   that one row. So a rail of subjects on the left, the year groups as chips
   across the top, and only that shelf's cards.

   The ranking is not thrown away, it is scoped. state.bank arrives ranked
   from lk_pool, and grouping it preserves that order inside each year group,
   so the best plan for Matematik Åk 8 is still the first card in that row.

   A second view, Coverage, is the whole catalogue as a grid — subjects down,
   year groups across — so the gaps show: where there is no plan at all, or
   none anyone has approved. A cell opens its shelf. */

export function loadPoolPick(): PoolPick {
  try {
    const v = JSON.parse(localStorage.getItem('lk.pool') || '{}') as Partial<PoolPick>;
    return { view: v.view === 'cover' ? 'cover' : 'shelf', sub: String(v.sub || ''), yr: String(v.yr || '') };
  } catch { return { view: 'shelf', sub: '', yr: '' }; }
}
export function savePoolPick() {
  try { localStorage.setItem('lk.pool', JSON.stringify(state.pool)); } catch { /* private window */ }
}

/** subject → year group → plans, each list still in lk_pool's ranked order
 *  (a Map keeps insertion order, so nothing is sorted twice). */
function groupPool(rows: BankRow[]) {
  const bySubject = new Map<string, Map<string, BankRow[]>>();
  for (const b of rows) {
    // Canonical, so "Idrott" and "Idrott och hälsa" are one entry, not two "PE"s.
    const sub = canonSubject(b.subject);
    if (!bySubject.has(sub)) bySubject.set(sub, new Map());
    const years = bySubject.get(sub)!;
    const yr = canonYear(b.year_group);
    if (!years.has(yr)) years.set(yr, []);
    years.get(yr)!.push(b);
  }
  return bySubject;
}

const byLabelSv = (fmt: (s: string) => string) => (a: string, b: string) =>
  fmt(a).localeCompare(fmt(b), LANG === 'en' ? 'en' : 'sv');
function sortYears(ys: string[]) {
  return ys.slice().sort((a, b) => (yearNum(a) - yearNum(b)) || byLabelSv(yearLabel)(a, b));
}

/* The two ways to look at the pool. A switch, not a filter: it changes the
   whole page, so it is drawn bigger than the dropdowns next to it. */
const ICON_SHELF = '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>';
const ICON_COVER = '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>';
function viewBtn(id: 'shelf' | 'cover', on: string, label: string, icon: string) {
  return '<button class="' + (on === id ? 'on' : '') + '" data-poolview="' + id + '" aria-pressed="' + (on === id) + '">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    icon + '</svg>' + esc(label) + '</button>';
}

function poolViewToggle() {
  const v = state.pool.view;
  const box = maybe$('poolview');
  if (!box) return;
  box.innerHTML =
    viewBtn('shelf', v, t('poolShelf'), ICON_SHELF) + viewBtn('cover', v, t('poolCover'), ICON_COVER);
}

export function renderBank() {
  const g = $('bankgrid');
  poolViewToggle();
  if (!state.bank.length) {
    // The "create one" line is wrong when a filter is simply matching nothing.
    const scope = maybe$<HTMLSelectElement>('f-scope')?.value;
    const appr = maybe$<HTMLSelectElement>('f-approval')?.value;
    g.innerHTML = '<p class="note">' + esc(
      appr === 'qualified' ? t('bankNoneQualified')
      : appr === 'teacher' ? t('bankNoneTeacher')
      : scope === 'shared' ? t('bankNoneShared') : t('bankEmpty')) + '</p>' +
      '<p><button class="btn btn-primary" data-create="">+ ' + esc(t('crCreate')) + '</button></p>';
    return;
  }

  const bySubject = groupPool(state.bank);
  const subjects = [...bySubject.keys()].sort(byLabelSv(subjectLabel));
  // Colors by position in the rail, so neighbours never share one.
  const acc = (sub: string) => SUBJECT_PALETTE[Math.max(0, subjects.indexOf(sub)) % SUBJECT_PALETTE.length];

  if (state.pool.view === 'cover') { g.innerHTML = poolCoverage(bySubject); return; }

  // Settle the pick: a remembered subject or year that this filter no longer
  // has falls back rather than showing an empty shelf.
  let sub = state.pool.sub;
  if (!bySubject.has(sub)) sub = subjects[0]!;
  const years = bySubject.get(sub)!;
  let yr = state.pool.yr;
  if (yr && !years.has(yr)) yr = '';
  state.pool.sub = sub; state.pool.yr = yr;

  const rail = '<nav class="poolrail" aria-label="' + esc(t('subjectLbl')) + '">' +
    subjects.map((s) => {
      const n = [...bySubject.get(s)!.values()].reduce((a, x) => a + x.length, 0);
      return '<button class="' + (s === sub ? 'on' : '') + '" style="--acc:' + acc(s) + '" data-poolsub="' + esc(s) + '">' +
        '<span class="dot"></span><span class="l">' + esc(subjectLabel(s)) + '</span><span class="n">' + n + '</span></button>';
    }).join('') + '</nav>';

  const order = sortYears([...years.keys()]);
  const total = [...years.values()].reduce((a, x) => a + x.length, 0);
  const chip = (v: string, label: string, n: number) =>
    '<button class="' + (v === yr ? 'on' : '') + '" data-poolyr="' + esc(v) + '">' + esc(label) + ' <span class="n">' + n + '</span></button>';
  const chips = '<div class="yrchips">' + chip('', t('allYears'), total) +
    order.map((y) => chip(y, yearLabel(y), years.get(y)!.length)).join('') + '</div>';

  // All years fill the width as one grid, youngest first and best-first
  // within each year, each card naming its year. A heading per year left most
  // of the screen empty, since a year rarely holds more than a card or two.
  const shelf = '<div class="poolyear"><div class="grid">' +
    (yr ? years.get(yr)!.map((b) => bankCard(b))
        : order.flatMap((y) => years.get(y)!.map((b) => bankCard(b, true)))).join('') +
    '</div></div>';

  g.innerHTML = '<div class="poolwrap">' + rail +
    '<section class="poolsub poolmain" style="--acc:' + acc(sub) + '">' +
      '<h3><span class="dot"></span>' + esc(subjectLabel(sub)) + '<span class="n">' + total + '</span></h3>' +
      chips + shelf +
    '</section></div>';
}

/** The whole catalogue as one grid: every grundskola subject down, F to Åk 9
 *  across, plus anything the pool holds outside the catalogue. Counts follow
 *  the source and approval filters, so "Qualified only" shows where qualified
 *  plans are missing. */
function poolCoverage(bySubject: Map<string, Map<string, BankRow[]>>) {
  const subs = [...new Set([...CATALOG_SUBJECTS, ...bySubject.keys()])].sort(byLabelSv(subjectLabel));
  const present = [...bySubject.values()].flatMap((m) => [...m.keys()]);
  const yrs = sortYears([...new Set([...CATALOG_YEARS, ...present])]);
  const head = '<tr><th></th>' + yrs.map((y) => '<th>' + esc(y === 'F' ? 'F' : yearLabel(y).replace(/^\D+/, '')) + '</th>').join('') + '</tr>';
  const body = subs.map((s) => {
    const years = bySubject.get(s);
    return '<tr><th>' + esc(subjectLabel(s)) + '</th>' + yrs.map((y) => {
      const rows = years?.get(y) || [];
      if (!rows.length) return '<td><button class="cv empty" data-create="' + esc(s) + '|' + esc(y) + '" title="' +
        esc(t('crEmptyCell') + ' — ' + subjectLabel(s) + ', ' + yearLabel(y)) + '">+</button></td>';
      const ok = rows.filter((b) => b.approved && !b.approval_stale).length;
      const tip = fillT('poolCellTip', { n: rows.length, a: ok }) + ' — ' + subjectLabel(s) + ', ' + yearLabel(y);
      return '<td><button class="cv ' + (ok ? (rows.length >= 3 ? 'full' : 'some') : 'unappr') + '" data-poolcell="' +
        esc(s) + '|' + esc(y) + '" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">' + rows.length + '</button></td>';
    }).join('') + '</tr>';
  }).join('');
  return '<div class="poolcov"><table>' + head + body + '</table></div>' +
    '<p class="cvlegend"><span class="cv full">3</span>' + esc(t('poolLegFull')) +
    '<span class="cv some">1</span>' + esc(t('poolLegSome')) +
    '<span class="cv unappr">1</span>' + esc(t('poolLegUnappr')) +
    '<span class="cv empty">·</span>' + esc(t('poolCellEmpty')) + '</p>';
}

/** Open a shelf: from the rail, a chip, a coverage cell, or an absence. */
export function openShelf(sub: string | null, yr: string | null) {
  if (sub != null) state.pool.sub = sub;
  if (yr != null) state.pool.yr = yr;
  state.pool.view = 'shelf';
  savePoolPick();
  renderBank();
}


/* ── Which class already had this lesson ─────────────────
   A good plan should be reused — with a different class. Staff and class group
   only; no pupil is named, here or anywhere in Lektionskollen. */
/** plan id → its uses, built once per load rather than filtered per card. */
let usesBy = new Map<string, UseRow[]>();
export async function loadUses() {
  const { data } = await sb.rpc('lk_uses');
  state.uses = data || [];
  usesBy = new Map();
  for (const u of state.uses) { const l = usesBy.get(u.plan_id); if (l) l.push(u); else usesBy.set(u.plan_id, [u]); }
}

/** "Last given to 7A on 12 Sept" — the line that stops a class getting a repeat. */
function usedLine(planId: string) {
  const u = usesOf(planId);
  if (!u.length) return '';
  const last = u[0]!;
  return '<p class="shline used">' + esc(fillT('usedLast', { g: last.group_name, d: fmtDate(last.used_on) })) +
    (u.length > 1 ? ' ' + esc(fillT('usedTimes', { n: u.length })) : '') + '</p>';
}

export function usesOf(planId: string, group?: string) {
  const l = usesBy.get(planId) || [];
  return group ? l.filter((u) => u.group_name === group) : l;
}

export function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(LANG === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short' });
}

/** Record that a plan went to a class. Silent: a failure here must never block
 *  a lesson, and never the approval it rides along with. A Supabase query
 *  builder is thenable but not a Promise, so it has no .catch to hang this on. */
export async function logUse(planId: string | null) {
  const r = state.row;
  if (!planId || !r || !r.group || r.group === '—') return;
  try {
    await sb.rpc('lk_log_run', {
      p_plan_id: planId, p_group: r.group, p_absence_ref: r.id || null, p_substitute: r.cover || null,
      p_time: r.start ? r.start + (r.end ? '–' + r.end : '') : null,
    });
    await loadUses();
  } catch { /* the lesson matters more than the bookkeeping */ }
}


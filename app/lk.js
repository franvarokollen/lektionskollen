/* Lektionskollen — the add-in, running against real Supabase.
   Schema: `lektionskollen` in the skolkollen-portal project, reached only
   through the public.lk_* security-definer functions. */

const SUPABASE_URL = 'https://pbamabzbfbkxajntsrmc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiYW1hYnpiZmJreGFqbnRzcm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzU3MTEsImV4cCI6MjA5NTkxMTcxMX0.9G3-2cFOHwVqVOsIBcHomrEEclISFUaIQlg10nIlWHM';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── Language ───────────────────────────────────────
   Mirrors FVK's own sv/en toggle. The generated plan keeps the language
   it was written in; only the chrome switches. */
let LANG = (() => { try { return localStorage.getItem('lk.lang') || 'sv'; } catch { return 'sv'; } })();
const t = (k) => (window.LK_T[LANG] && window.LK_T[LANG][k]) || window.LK_T.sv[k] || k;

function setLang(l) {
  LANG = l;
  try { localStorage.setItem('lk.lang', l); } catch { /* private window */ }
  document.documentElement.lang = l;
  applyStatic();
  renderNav();
  if (state.me) $('username').textContent = state.me.role === 'demo' ? t('demoRole') : state.me.role;
  renderRows();
  renderBank();
  fillFilterOptions();
  setTitles();
  if (state.bodies) state.plan = pickBody();
  if (!$('overlay').hidden) { state.plan ? showPlan() : showRequest(); }
}

/** Everything marked data-t in the HTML. */
function applyStatic() {
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.getAttribute('data-t')); });
  document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('on', b.getAttribute('data-lang') === LANG));
}

function setTitles() {
  const onBank = !$('screen-bank').hidden;
  $('pagetitle').textContent = onBank ? t('titleBank') : t('titleCover');
  $('pagesub').textContent = onBank
    ? state.bank.length + ' ' + t('plansCount') + ' · ' + state.bank.filter((b) => b.shared).length + ' ' + t('sharedBetween')
    : new Date().toLocaleDateString(LANG === 'sv' ? 'sv-SE' : 'en-GB',
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/* ── Sidebar nav — FVK's items and icons ───────────── */
const ICONS = {
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M9 10h6"/>',
  radar: '<circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10"/><path d="M2 12h20"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
};

/* `real` items work here; the rest are FVK pages, shown so the shell reads
   like the product rather than a demo with two links. */
const NAV = [
  { id: 'cover', icon: 'users',     key: 'navCover',     real: true },
  { id: 'bank',  icon: 'clipboard', key: 'navBank',      real: true, addon: true },
  { id: 'hub',   icon: 'clipboard', key: 'navHub' },
  { id: 'radar', icon: 'radar',     key: 'navRadar' },
  { id: 'dash',  icon: 'grid',      key: 'navDashboard' },
  { id: 'set',   icon: 'settings',  key: 'navSettings' },
];

function renderNav() {
  $('nav').innerHTML = NAV.map((n) => {
    const active = n.id === state.screen;
    const stroke = active ? '#0F71F6' : 'rgba(255,255,255,0.45)';
    return '<button data-nav="' + n.id + '"' + (active ? ' class="on"' : '') + '>' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + stroke +
      '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      ICONS[n.icon] + '</svg><span class="lbl">' + esc(t(n.key)) + '</span>' +
      (n.addon ? '<span class="chip chip-blue" style="font-size:10px;padding:1px 6px">' + esc(t('addon')) + '</span>' : '') +
      '</button>';
  }).join('');
}

function toast(msg, ms = 4000) {
  const box = $('toast');
  box.textContent = msg;
  box.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { box.hidden = true; }, ms);
}

/* ── Stand-in for FVK's cover feed ──────────────────
   Shape mirrors cover_assignments. When FVK is wired up these arrive
   in the lk:init message instead. */
const ROWS = [
  { id: 'abs-1', time: '08:20–09:20', start: '08:20', end: '09:20', mins: 60, teacher: 'Anna Lindqvist',
    group: 'Tb7a', raw: 'Ma', subject: 'Matematik', year: 'Åk 7', room: 'A101', cover: 'Erik Sandberg', plannable: true },
  { id: 'abs-2', time: '09:40–10:40', start: '09:40', end: '10:40', mins: 60, teacher: 'Anna Lindqvist',
    group: 'Tb7b', raw: 'Ma', subject: 'Matematik', year: 'Åk 7', room: 'A101', cover: null, plannable: true },
  { id: 'abs-3', time: '10:00–10:45', start: '10:00', end: '10:45', mins: 45, teacher: 'Johan Berg',
    group: '', raw: 'Rast', subject: '—', year: '', room: 'Korridor B', cover: 'Sara Nilsson',
    plannable: false, whyKey: 'whyRast' },
  { id: 'abs-4', time: '11:00–11:45', start: '11:00', end: '11:45', mins: 45, teacher: 'Johan Berg',
    group: 'Tb5c', raw: 'Sv', subject: 'Svenska', year: 'Åk 5', room: 'B204', cover: 'Sara Nilsson', plannable: true },
  { id: 'abs-5', time: '13:00–14:00', start: '13:00', end: '14:00', mins: 60, teacher: 'Johan Berg',
    group: 'Tb9a', raw: 'En', subject: 'Engelska', year: 'Åk 9', room: 'B204', cover: null, plannable: true },
  { id: 'abs-6', time: '07:30–15:30', start: '07:30', end: '15:30', mins: 480, teacher: 'Leila Haddad',
    group: '', raw: 'Arbetstid', subject: '—', year: '', room: '', cover: null,
    plannable: false, whyKey: 'whyArbetstid' },
  { id: 'abs-7', time: '14:15–15:35', start: '14:15', end: '15:35', mins: 80, teacher: 'Leila Haddad',
    group: 'Tb8b:SltmHT', raw: 'Sl', subject: 'Slöjd', year: 'Åk 8', room: 'Slöjdsal 2',
    cover: 'Mats Ek', plannable: true, practical: true },
];

const state = { me: null, row: null, plan: null, bodies: null, planId: null, view: 'coordinator', bank: [], screen: 'cover' };

/* ── No login in the test env ───────────────────────
   The lk_* functions fall back to the shared demo school for anonymous
   callers. Revoking the anon grants in Postgres restores a real login
   without touching this file. */
function boot() {
  document.documentElement.lang = LANG;
  applyStatic();
  renderNav();
  enterApp();
}

$('signout').addEventListener('click', () => location.reload());

async function enterApp() {
  const { data, error } = await sb.rpc('lk_me');
  if (error) {
    document.body.innerHTML = '<p style="padding:40px;font:14px Geist,sans-serif">Kunde inte nå databasen: ' + esc(error.message) + '</p>';
    return;
  }

  if (!data || !data.school_id) {
    document.body.innerHTML = '<p style="padding:40px;font:14px Geist,sans-serif">Demoskolan saknas i databasen.</p>';
    return;
  }

  state.me = data;
  $('app').hidden = false;
  $('schoolname').textContent = data.school;
  $('username').textContent = data.role === 'demo' ? 'Delad testmiljö' : data.role;
  $('pagesub').textContent = new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  renderRows();
  loadBank();
}

/* ── Cover table ───────────────────────────────────── */
function renderRows() {
  $('rows').innerHTML = ROWS.map((r) => {
    const action = !r.plannable
      ? '<span class="nolesson">' + esc(t(r.whyKey)) + '</span>'
      : '<button class="btn btn-primary btn-sm" data-open="' + r.id + '">' + esc(t('needPlan')) + '</button>';
    return '<tr' + (r.plannable ? '' : ' class="muted"') + '>' +
      '<td class="mono">' + esc(r.time) + '</td>' +
      '<td class="who">' + esc(r.teacher) + '</td>' +
      '<td>' + (r.group ? esc(r.group) : '<span class="nolesson">—</span>') + '</td>' +
      '<td>' + (r.plannable
        ? esc(r.subject) + ' <span class="nolesson" style="font-style:normal">(' + esc(r.raw) + ')</span>'
        : esc(r.raw)) + '</td>' +
      '<td>' + esc(r.room || '—') + '</td>' +
      '<td>' + (r.cover
        ? '<span class="chip chip-ok">' + esc(r.cover) + '</span>'
        : '<span class="chip chip-warn">' + esc(t('uncovered')) + '</span>') + '</td>' +
      '<td style="text-align:right">' + action + '</td></tr>';
  }).join('');
}

/* ── Bank ──────────────────────────────────────────── */
async function loadBank() {
  const subject = $('f-subject').value || null;
  const year = $('f-year').value || null;
  const scope = $('f-scope').value || 'all';
  const { data, error } = await sb.rpc('lk_bank_list', { p_subject: subject, p_year: year, p_scope: scope });
  if (error) { $('bankgrid').innerHTML = '<p class="note">Kunde inte läsa banken: ' + esc(error.message) + '</p>'; return; }
  state.bank = data || [];
  fillFilterOptions();
  renderBank();
}

function fillFilterOptions() {
  const subs = [...new Set(state.bank.map((b) => b.subject))].sort();
  const yrs = [...new Set(state.bank.map((b) => b.year_group))].sort();
  const keep = (sel, list, label) => {
    const cur = sel.value;
    sel.innerHTML = '<option value="">' + esc(label) + '</option>' +
      list.map((x) => '<option' + (x === cur ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
  };
  keep($('f-subject'), subs, t('allSubjects'));
  keep($('f-year'), yrs, t('allYears'));
  const sc = $('f-scope'), cur = sc.value || 'all';
  sc.innerHTML = [['all', t('allSources')], ['mine', t('ourSchool')], ['shared', t('sharedOnly')]]
    .map(([v, l]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>').join('');
}

/** A bank row's title in the reader's language, else the one it has. */
function rowTitle(b) {
  if (b.language_alt === LANG && b.title_alt) return b.title_alt;
  return b.title;
}

function stars(r) {
  const n = Math.round(Number(r) || 0);
  return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
}

function renderBank() {
  const g = $('bankgrid');
  if (!state.bank.length) {
    g.innerHTML = '<p class="note">' + esc(t('bankEmpty')) + '</p>';
    return;
  }
  g.innerHTML = state.bank.map((b) =>
    '<div class="bcard">' +
      '<h4>' + esc(rowTitle(b)) + '</h4>' +
      '<div class="tags">' +
        '<span class="chip chip-neutral">' + esc(b.subject) + '</span>' +
        '<span class="chip chip-neutral">' + esc(b.year_group) + '</span>' +
        '<span class="chip chip-neutral">' + b.minutes + ' min</span>' +
        (b.shared ? '<span class="chip chip-blue">' + esc(t('shared')) + '</span>'
                  : '<span class="chip chip-neutral">' + esc(t('onlyOurSchool')) + '</span>') +
        (b.approved ? '' : '<span class="chip chip-warn">' + esc(t('notApproved')) + '</span>') +
      '</div>' +
      '<div class="stat">' +
        '<span class="stars">' + stars(b.rating) + ' <b>' + (Number(b.rating) || 0).toFixed(1) + '</b></span>' +
        '<span><b>' + b.rating_count + '</b> ' + esc(t('ratings')) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<button class="btn btn-soft btn-sm" data-viewplan="' + b.id + '">' + esc(t('open')) + '</button>' +
        (b.approved ? '<button class="btn btn-ghost btn-sm" data-copylink="' + esc(b.share_token) + '">' + esc(t('copyLink')) + '</button>' : '') +
      '</div>' +
    '</div>').join('');
}

/* ── Add-in ────────────────────────────────────────── */
function openAddin(id) {
  state.row = ROWS.find((x) => x.id === id);
  state.plan = null; state.planId = null; state.view = 'coordinator';
  $('overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  showRequest();
}
function closeAddin() {
  $('overlay').hidden = true;
  document.body.style.overflow = '';
}

function showRequest() {
  const r = state.row;
  $('seam-state').textContent = 'lk:init';
  const matches = state.bank.filter((b) => b.subject === r.subject && b.year_group === r.year && b.approved);
  $('addin-content').innerHTML =
  '<div class="addin-body">' +
    '<div class="addin-head"><div style="flex:1;min-width:0">' +
      '<h2 id="addin-title">' + esc(t('planFor')) + ' ' + esc(r.group) + '</h2>' +
      '<div class="plan-meta">' + esc(r.teacher) + ' · ' + esc(r.time) + ' · ' + esc(r.room) +
      (r.cover ? ' · ' + esc(r.cover) : ' · ' + esc(t('uncovered').toLowerCase())) + '</div></div>' +
      '<button class="x" data-close aria-label="Stäng">✕</button></div>' +

    '<div class="derived">' +
      '<div><dt>' + esc(t('subjectLbl')) + '</dt><dd>' + esc(r.subject) + '</dd><div class="from">' + esc(t('fromCode')) + ' "' + esc(r.raw) + '"</div></div>' +
      '<div><dt>' + esc(t('yearLbl')) + '</dt><dd>' + esc(r.year) + '</dd><div class="from">' + esc(t('derivedFrom')) + ' "' + esc(r.group) + '"</div></div>' +
      '<div><dt>' + esc(t('lengthLbl')) + '</dt><dd>' + r.mins + ' ' + esc(t('min')) + '</dd><div class="from">' + esc(r.start) + '–' + esc(r.end) + '</div></div>' +
    '</div>' +

    (r.practical ? '<div class="flag"><span>⚠</span><div><b>' + esc(t('practicalWarn')) + '</b> ' + esc(t('practicalBody')) + '</div></div>' : '') +

    (matches.length
      ? '<div><div class="sect-h">' + esc(t('fromBank')) + ' — ' + matches.length + ' ' + esc(matches.length === 1 ? t('bankApproved') : t('bankApprovedPl')) + '</div><div class="bankrow">' +
        matches.map((b) => '<button class="bankcard" data-usebank="' + b.id + '">' +
          '<div style="flex:1;min-width:0"><div class="t">' + esc(rowTitle(b)) + '</div>' +
          '<div class="m">' + b.minutes + ' ' + esc(t('min')) + ' · ' + b.rating_count + ' ' + esc(t('ratings')) + (b.shared ? ' · ' + esc(t('sharedTag')) : '') + '</div></div>' +
          '<span class="stars">' + stars(b.rating) + '</span>' +
          '<span class="btn btn-soft btn-sm">' + esc(t('use')) + '</span></button>').join('') + '</div></div>'
      : '<div><div class="sect-h">' + esc(t('fromBank')) + '</div><p class="hint">' + esc(t('bankNone')) + ' ' + esc(r.subject) + ' ' + esc(r.year) + ' ' + esc(t('bankNoneTail')) + '</p></div>') +

    '<div><div class="sect-h">' + esc(t('steer')) + '</div><div class="steer">' +
      '<label class="f full">' + esc(t('fTopic')) + '<input id="s-topic" placeholder="' + esc(t('fTopicPh')) + '"></label>' +
      '<label class="f full">' + esc(t('fNotes')) + '<textarea id="s-notes" rows="2" placeholder="' + esc(t('fNotesPh')) + '"></textarea></label>' +
      '<label class="f">' + esc(t('fType')) + '<select id="s-type">' +
        (r.practical ? ['typeTheory', 'typeContinue', 'typePractical'] : ['typeRevision', 'typeNew', 'typeDeep', 'typeQuiet'])
          .map((k) => '<option>' + esc(t(k)) + '</option>').join('') +
      '</select></label>' +
      '<label class="f">' + esc(t('fLevel')) + '<select id="s-level">' +
        ['lvlStandard', 'lvlAdapted', 'lvlStretch'].map((k) => '<option>' + esc(t(k)) + '</option>').join('') + '</select></label>' +
      '<label class="f">' + esc(t('fKnow')) + '<select id="s-know">' +
        ['knowNone', 'knowSome', 'knowFull'].map((k) => '<option>' + esc(t(k)) + '</option>').join('') + '</select></label>' +
      '<label class="f">' + esc(t('fLang')) + '<select id="s-lang">' +
        '<option value="sv">' + esc(t('langSv')) + '</option><option value="en">' + esc(t('langEn')) + '</option></select></label>' +
      '<div class="full"><div class="sect-h" style="margin-bottom:6px">' + esc(t('fRes')) + '</div><div class="chips">' +
        ['resWhiteboard', 'resProjector', 'resComputers', 'resBooks', 'resMini']
          .map((k, i) => '<button class="tog' + (i === 0 ? ' on' : '') + '" data-res>' + esc(t(k)) + '</button>').join('') +
      '</div></div>' +
    '</div></div>' +

    '<div class="foot"><span class="hint">' + esc(t('privacyNote')) + '</span>' +
      '<span class="spacer"></span><button class="btn btn-ghost" data-close>' + esc(t('cancel')) + '</button>' +
      '<button class="btn btn-primary" data-generate>' + esc(t('create')) + '</button></div>' +
  '</div>';
}

function gatherRequest() {
  const r = state.row;
  return {
    absence_ref: r.id,
    subject: r.subject,
    year_group: r.year,
    group_name: r.group,
    room: r.room,
    starts_at: r.start,
    ends_at: r.end,
    minutes: r.mins,
    topic: $('s-topic')?.value || '',
    notes: $('s-notes')?.value || '',
    lesson_type: $('s-type')?.value || '',
    level: $('s-level')?.value || '',
    sub_knowledge: $('s-know')?.value || '',
    language: $('s-lang')?.value || 'sv',
    resources: [...document.querySelectorAll('[data-res].on')].map((b) => b.textContent),
  };
}

async function generate() {
  const req = gatherRequest();
  $('seam-state').textContent = t('seamGenerating');
  $('addin-content').innerHTML =
    '<div class="gen"><div class="bar"><i id="pbar" style="width:12%"></i></div>' +
    '<div class="genstep" id="pstep">' + esc(t('genCalling')) + '</div>' +
    '<p class="hint" style="max-width:420px">' + esc(t('genNote')) + '</p></div>';

  let pct = 12;
  const tick = setInterval(() => { pct = Math.min(90, pct + 9); const b = $('pbar'); if (b) b.style.width = pct + '%'; }, 400);

  // Both languages, so whoever opens the plan reads it in theirs. The written
  // library answers instantly; with a real model this becomes one generation
  // plus a translation rather than two generations.
  const other = req.language === 'en' ? 'sv' : 'en';
  const [main, alt] = await Promise.all([
    sb.functions.invoke('lk-generate', { body: { request: req } }),
    sb.functions.invoke('lk-generate', { body: { request: { ...req, language: other } } }),
  ]);
  clearInterval(tick);

  if (main.error || main.data?.error) {
    const msg = main.data?.error || main.error?.message || 'okänt fel';
    $('addin-content').innerHTML =
      '<div class="addin-body"><div class="addin-head"><h2>' + esc(t('failed')) + '</h2>' +
      '<button class="x" data-close aria-label="Stäng">✕</button></div>' +
      '<div class="alert error">' + esc(msg) + '</div>' +
      '<div class="foot"><span class="spacer"></span><button class="btn btn-ghost" data-close>' + esc(t('cancel')) + '</button>' +
      '<button class="btn btn-primary" data-generate>' + esc(t('retry')) + '</button></div></div>';
    return;
  }

  const altPlan = (!alt.error && !alt.data?.error) ? alt.data.plan : null;

  const { data: pid, error: saveErr } = await sb.rpc('lk_save_plan', {
    p_request: req,
    p_plan: main.data.plan,
    p_model: main.data.model || null,
    p_plan_alt: altPlan,
    p_language_alt: altPlan ? other : null,
  });
  if (saveErr) toast(t('saveFailed') + ' ' + saveErr.message);

  state.bodies = { [req.language]: main.data.plan };
  if (altPlan) state.bodies[other] = altPlan;
  state.plan = pickBody();
  state.planId = pid || null;
  state.approved = false;
  state.shareToken = null;
  showPlan();
  loadBank();
}

/** The plan in the reader's language, falling back to whatever exists. */
function pickBody() {
  const b = state.bodies || {};
  return b[LANG] || b.sv || b.en || Object.values(b)[0] || null;
}

/** True when the plan is not available in the language being read. */
function bodyIsFallback() {
  return !!(state.bodies && !state.bodies[LANG]);
}

async function usePlan(id) {
  const { data, error } = await sb.rpc('lk_plan', { p_id: id });
  if (error || !data) { toast('Kunde inte öppna planen'); return; }
  state.bodies = { [data.language || 'sv']: data.body };
  if (data.body_alt && data.language_alt) state.bodies[data.language_alt] = data.body_alt;
  state.plan = pickBody();
  state.planId = data.id;
  state.approved = data.approved;
  state.shareToken = data.share_token;
  if (!state.row) state.row = { subject: data.subject, year: data.year_group, group: '—', mins: data.minutes, start: '', end: '', room: '—', teacher: '—', cover: null };
  $('overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  showPlan();
}

function showPlan() {
  const r = state.row, p = state.plan;
  $('seam-state').textContent = state.approved ? t('seamApproved') : t('seamWaiting');
  const fallbackNote = bodyIsFallback()
    ? '<div class="flag" style="background:var(--warn-bg);color:#7c4a02"><span>!</span><div>' + esc(t('onlyInOther')) + '</div></div>'
    : '';
  const head =
  '<div class="addin-body">' +
    '<div class="addin-head"><div style="flex:1;min-width:0">' +
      '<h2 id="addin-title" class="plan-title">' + esc(p.title) + '</h2>' +
      '<div class="plan-meta">' + esc(r.subject) + ' · ' + esc(r.year) + ' · ' + esc(r.group) +
      (r.start ? ' · ' + esc(r.start) + '–' + esc(r.end) : '') + '</div></div>' +
      '<button class="x" data-close aria-label="Stäng">✕</button></div>' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<div class="viewtog">' +
        '<button class="' + (state.view === 'coordinator' ? 'on' : '') + '" data-view="coordinator">' + esc(t('viewCoord')) + '</button>' +
        '<button class="' + (state.view === 'vikarie' ? 'on' : '') + '" data-view="vikarie">' + esc(t('viewSub')) + '</button>' +
      '</div>' +
      // The sidebar toggle sits behind this overlay, so the plan carries its own.
      (state.bodies && Object.keys(state.bodies).length > 1
        ? '<div class="viewtog">' + ['sv', 'en'].filter((c) => state.bodies[c]).map((c) =>
            '<button class="' + (c === LANG ? 'on' : '') + '" data-planlang="' + c + '">' +
            (c === 'sv' ? 'SV' : 'EN') + '</button>').join('') + '</div>'
        : '') +
      '<span class="hint">' +
      (state.view === 'coordinator' ? esc(t('coordHint')) : esc(t('subHint')) + ' ' + esc(p.readTime || '')) +
      '</span></div>';
  $('addin-content').innerHTML = head + fallbackNote +
    (state.view === 'coordinator' ? coordView(p, r) : vikarieView(p, r)) + '</div>';
}

function minDiff(a, b) {
  const [h1, m1] = a.split(':').map(Number), [h2, m2] = b.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

function coordView(p, r) {
  const phases = p.phases || [];
  const sum = phases.reduce((a, ph) => { const m = String(ph.t || '').split('–'); return a + (m.length === 2 ? minDiff(m[0], m[1]) : 0); }, 0);
  const link = state.shareToken ? location.href.replace(/index\.html.*$|\/?$/, '/') + 'plan.html?t=' + state.shareToken : null;
  return '<div class="plan">' +
    '<div class="ps" style="border:0;padding-top:4px"><h4>' + esc(t('whatItIs')) + '</h4><p>' + esc(p.summary) + '</p></div>' +
    '<div class="twocol">' +
      '<div class="callout"><strong>' + esc(t('goal')) + '</strong>' + esc(p.goal) + '</div>' +
      '<div class="callout"><strong>' + esc(t('curriculum')) + '</strong><span style="font-size:12.5px">' + esc(p.curriculum) + '</span></div>' +
    '</div>' +
    '<div class="ps"><h4>' + esc(t('toCheck')) + '</h4><ul>' +
      '<li>' + esc(t('phasesSum')) + ' <b>' + sum + ' ' + esc(t('min')) + '</b> — ' + esc(t('lessonIs')) + ' ' + r.mins + ' ' + esc(t('min')) + '. ' +
        (sum === r.mins ? '<span class="chip chip-ok">' + esc(t('matches')) + '</span>'
                        : '<span class="chip chip-warn">' + esc(t('checkIt')) + '</span>') + '</li>' +
      '<li>' + esc(t('allWritten')) + ' <span class="chip chip-ok">' + esc(t('ok')) + '</span></li>' +
      '<li>' + esc(t('requires')) + ' ' + esc(p.equipment?.need || '—') + '</li>' +
    '</ul></div>' +
    (state.approved
      ? '<div class="flag" style="background:var(--ok-bg);color:#14532d"><span>✓</span><div><b>' + esc(t('approvedTitle')) + '</b> ' +
        (link ? esc(t('subLink')) + ' <span class="mono" style="font-size:12px">' + esc(link) + '</span>' : '') + '</div></div>'
      : '') +
    '<div class="foot">' +
      (state.approved
        ? '<span class="spacer"></span><button class="btn btn-ghost" data-view="vikarie">' + esc(t('seeSubView')) + '</button>' +
          (link ? '<button class="btn btn-primary" data-copylink="' + esc(state.shareToken) + '">' + esc(t('copyLink')) + '</button>' : '')
        : '<span class="hint">' + esc(t('nothingBefore')) + '</span><span class="spacer"></span>' +
          '<button class="btn btn-ghost" data-regen>' + esc(t('regen')) + '</button>' +
          '<button class="btn btn-ok" data-approve>' + esc(t('approve')) + '</button>') +
    '</div></div>';
}

/* ── Live assist (coordinator preview) ──────────────────
   The coordinator sees exactly what the substitute gets, and can judge the
   quality of it, but nothing here is saved: the heat map that tells us which
   sections are weak must be substitute presses only, not curiosity. */
function assistRow(ref, label) {
  const a = (k, v, txt) =>
    '<button data-assist="' + k + '" data-ref="' + esc(ref) + '"' +
    (v ? ' data-variant="' + v + '"' : '') +
    ' data-alabel="' + esc(label) + '">' + esc(txt) + '</button>';
  return '<div class="assist noprint">' +
    a('explain', '', t('aExplain')) + a('exercise', '', t('aExercise')) +
    a('level', 'easier', t('aEasier')) + a('level', 'harder', t('aHarder')) + '</div>';
}

function assistSheetHtml(extra, source) {
  const srcTxt = source === 'model' ? t('srcModel') : source === 'fallback' ? t('srcFallback') : t('srcLibrary');
  let h = '<h3>' + esc(extra.title) + '</h3><div class="src">' + esc(srcTxt) +
          (extra.minutes ? ' · ' + extra.minutes + ' min' : '') + ' · ' + esc(t('assistPreview')) + '</div>';
  h += '<ol>' + (extra.lines || []).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>';
  if (extra.board) {
    h += '<h4 style="font-size:13px;margin-bottom:5px">' + esc(t('boardNow')) + '</h4>' +
         '<div class="board">' + esc(extra.board) + '</div>';
  }
  if ((extra.tasks || []).length) {
    h += '<h4 style="font-size:13px;margin:14px 0 5px">' + esc(t('tasksNow')) + '</h4>' +
         '<ol style="font-size:13.5px">' + extra.tasks.map((x) =>
           '<li>' + esc(x.q) + ' <span class="ans">' + esc(x.a) + '</span></li>').join('') + '</ol>';
  }
  return h;
}

async function previewAssist(opts) {
  const sheet = $('assist-sheet'), bodyEl = $('assist-sheet-body');
  bodyEl.innerHTML = '<h3><span class="spin"></span> ' + esc(t('working')) + '</h3>';
  sheet.hidden = false;

  const r = state.row, p = state.plan;
  const { data, error } = await sb.functions.invoke('lk-assist', {
    body: {
      kind: opts.kind,
      section_ref: opts.ref,
      section_label: opts.label,
      section_text: opts.text || '',
      variant: opts.variant || '',
      language: LANG,
      subject: r?.subject,
      year_group: r?.year,
      topic: p?.title,
      minutes_left: opts.minutes || undefined,
    },
  });
  if (error || !data?.extra) {
    bodyEl.innerHTML = '<h3>—</h3><p class="muted">' + esc(error?.message || 'error') + '</p>';
    return;
  }
  // The response carries both languages; show the one being read.
  const shown = data.language === LANG ? data.extra
              : (data.language_alt === LANG && data.extra_alt) ? data.extra_alt
              : data.extra;
  bodyEl.innerHTML = assistSheetHtml(shown, data.source);
}

function vikarieView(p, r) {
  const L = (x) => esc(x);
  let h = '<div class="plan">';
  h += '<div class="flag" style="background:#f0f5fb;color:#14407a"><span>①</span><div><b>' + esc(t('first90')) + '</b>' +
       '<ul style="margin:6px 0 0;padding-left:18px">' + (p.first90 || []).map((x) => '<li>' + L(x) + '</li>').join('') + '</ul></div></div>';
  h += '<div class="ps"><h4>' + esc(t('overview')) + '</h4><p>' + L(p.summary) + '</p>' +
       '<p style="font-size:13px;color:var(--ink-soft)"><b>' + esc(t('goalShort')) + '</b> ' + L(p.goal) + '</p></div>';
  h += '<div class="ps"><h4>' + esc(t('boardTitle')) + '</h4><div class="board">' + L(p.board) + '</div>' +
       '<p style="margin-top:8px;font-size:13px"><b>' + esc(t('youNeed')) + '</b> ' + L(p.equipment?.need) + '<br>' +
       '<span style="color:var(--ink-soft)">' + L(p.equipment?.fallback) + '</span></p></div>';

  h += '<div class="ps"><h4>' + esc(t('lessonClock')) + '</h4>';
  (p.phases || []).forEach((ph, i) => {
    h += '<div class="phase"><div class="phase-h"><span class="clock">' + L(ph.t) + '</span><strong>' + L(ph.n) + '</strong></div>' +
      '<div class="say"><em>' + esc(t('say')) + '</em>' + L(ph.say) + '</div>' +
      '<p style="font-size:13px"><b>' + esc(t('pupils')) + '</b> ' + L(ph.pupils) + '</p>' +
      (ph.expect && ph.expect !== '—' ? '<p style="font-size:13px;color:var(--ink-soft)"><b>' + esc(t('expected')) + '</b> ' + L(ph.expect) + '</p>' : '') +
      ((ph.checks || []).length
        ? '<p style="font-size:13px;margin-bottom:3px"><b>' + esc(t('checkQ')) + '</b></p><ul style="margin:0;padding-left:18px;font-size:13px">' +
          ph.checks.map((c) => '<li>' + L(c.q) + '<br><span class="ans">' + esc(t('answer')) + ' ' + L(c.a) + '</span></li>').join('') + '</ul>'
        : '') + assistRow('phase:' + i, ph.n) + '</div>';
  });
  h += '</div>';

  h += '<div class="ps"><h4>' + esc(t('handouts')) + '</h4>' +
    (p.materials || []).map((m) => '<div class="mat"><h5>' + L(m.h) + '</h5><div>' + L(m.body) + '</div></div>').join('') + '</div>';
  h += '<div class="ps"><h4>' + esc(t('tasksTitle')) + '</h4><ol style="font-size:13.5px">' +
    (p.tasks || []).map((x) => '<li>' + L(x.q) + ' <span class="ans">' + L(x.a) + '</span></li>').join('') + '</ol>' +
    assistRow('tasks', t('tasksTitle')) + '</div>';
  h += '<div class="ps"><h4>' + esc(t('earlyStuck')) + '</h4><div class="twocol">' +
    '<div class="callout"><strong>' + esc(t('stuckL')) + '</strong>' + L(p.stuck) + '</div>' +
    '<div class="callout"><strong>' + esc(t('aheadL')) + '</strong>' + L(p.ahead) + '</div></div></div>';
  h += '<div class="ps"><h4>' + esc(t('goesWrong')) + '</h4><p>' + L(p.wrong) + '</p></div>';
  h += '<div class="ps"><h4>' + esc(t('exitTicket')) + '</h4><p>' + L(p.exit?.q) + '<br><span class="ans">' + L(p.exit?.a) + '</span></p></div>';
  h += '<div class="ps"><h4>' + esc(t('whoToCall')) + '</h4><p><b>' + esc(t('coordinator')) + '</b> · ' + esc(state.me?.school || '') +
       '<br><span style="color:var(--ink-soft);font-size:13px">' + esc(t('phoneNote')) + '</span></p></div>';
  h += '<div class="ps"><h4>' + esc(t('handoverT')) + '</h4><p style="white-space:pre-wrap">' + L(p.handover) + '</p></div>';
  h += '<div class="ps"><h4>' + esc(t('assistTitle')) + '</h4>' +
       '<p class="hint" style="margin:0 0 9px">' + esc(t('assistNote')) + '</p>' +
       '<div class="assist noprint"><span class="hint" style="align-self:center">' + esc(t('minLeft')) + '</span>' +
       [5, 10, 15, 20].map((m) => '<button data-fill="' + m + '">' + m + '</button>').join('') +
       '</div></div>';
  h += '<div class="foot"><span class="hint">' + esc(t('subSeesThis')) + '</span><span class="spacer"></span>' +
       '<button class="btn btn-ghost" data-view="coordinator">' + esc(t('back')) + '</button></div></div>';
  return h;
}

/* ── Events ────────────────────────────────────────── */
document.addEventListener('click', async (e) => {
  // Live assist, handled first: the delegation guard below does not list
  // these attributes and would drop them.
  const a = e.target.closest('[data-assist]');
  if (a) {
    return previewAssist({
      kind: a.getAttribute('data-assist'),
      ref: a.getAttribute('data-ref'),
      label: a.getAttribute('data-alabel'),
      variant: a.getAttribute('data-variant') || '',
      text: a.closest('.phase, .ps')?.innerText?.slice(0, 1200) || '',
    });
  }
  const fill = e.target.closest('[data-fill]');
  if (fill) {
    return previewAssist({
      kind: 'filler', ref: 'lesson', label: t('aFill'),
      minutes: Number(fill.getAttribute('data-fill')),
    });
  }
  if (e.target.closest('[data-assistclose]') || e.target.id === 'assist-sheet') {
    $('assist-sheet').hidden = true;
    return;
  }

  const el = e.target.closest('[data-open],[data-close],[data-generate],[data-approve],[data-regen],[data-view],[data-planlang],[data-usebank],[data-res],[data-viewplan],[data-copylink],[data-nav],[data-lang],#refreshbank');
  if (!el) return;
  const t2 = el;

  if (t2.hasAttribute('data-lang')) return setLang(t2.getAttribute('data-lang'));
  if (t2.hasAttribute('data-nav')) {
    const id = t2.getAttribute('data-nav');
    const item = NAV.find((n) => n.id === id);
    if (!item.real) { toast(t('notHere')); return; }
    return showScreen(id);
  }
  if (t2.id === 'refreshbank') return loadBank();
  if (t2.hasAttribute('data-res')) return t2.classList.toggle('on');
  if (t2.hasAttribute('data-open')) return openAddin(t2.getAttribute('data-open'));
  if (t2.hasAttribute('data-close')) return closeAddin();
  if (t2.hasAttribute('data-generate')) return generate();
  if (t2.hasAttribute('data-regen')) return showRequest();
  if (t2.hasAttribute('data-view')) { state.view = t2.getAttribute('data-view'); return showPlan(); }
  if (t2.hasAttribute('data-planlang')) return setLang(t2.getAttribute('data-planlang'));
  if (t2.hasAttribute('data-viewplan')) return usePlan(t2.getAttribute('data-viewplan'));
  if (t2.hasAttribute('data-usebank')) return usePlan(t2.getAttribute('data-usebank'));

  if (t2.hasAttribute('data-copylink')) {
    const url = location.href.replace(/[^/]*$/, '') + 'plan.html?t=' + t2.getAttribute('data-copylink');
    try { await navigator.clipboard.writeText(url); toast(t('copied')); }
    catch { toast(url, 12000); }
    return;
  }

  if (t2.hasAttribute('data-approve')) {
    const { error } = await sb.rpc('lk_approve', { p_id: state.planId });
    if (error) { toast('Kunde inte godkänna: ' + error.message); return; }
    await sb.rpc('lk_rate_v2', { p_id: state.planId, p_reuse: true, p_reasons: [] });
    const { data } = await sb.rpc('lk_plan', { p_id: state.planId });
    state.approved = true;
    state.shareToken = data?.share_token || null;
    showPlan();
    loadBank();
    toast('Godkänd och sparad i banken');
    return;
  }
});

// Escape closes the assist sheet first; only if nothing is over the plan
// does it close the add-in. Listeners on the same target fire in
// registration order, so this has to be one handler, not two.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const sheet = $('assist-sheet');
  if (sheet && !sheet.hidden) { sheet.hidden = true; return; }
  if (!$('overlay').hidden) closeAddin();
});
$('overlay').addEventListener('mousedown', (e) => { if (e.target.id === 'overlay') closeAddin(); });
['f-subject', 'f-year', 'f-scope'].forEach((id) => $(id).addEventListener('change', loadBank));

function showScreen(which) {
  state.screen = which;
  $('screen-cover').hidden = which !== 'cover';
  $('screen-bank').hidden = which !== 'bank';
  renderNav();
  if (which === 'bank') loadBank();
  setTitles();
  window.scrollTo(0, 0);
}

boot();

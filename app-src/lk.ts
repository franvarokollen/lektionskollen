/* Lektionskollen — the coordinator app: sign-in, the cover table, the plan
   panel, and the page's event wiring. The rest lives in lk-*.ts. */
import { Plan } from './types';
import { canonSubject, canonYear, subjectLabel, yearLabel } from './lk-catalog';
import { $, CheckProblem, CoverPlan, Extra, LANG, Lang, Row, StrMap, Verdict, esc, fillT, maybe$, sb, setLangValue, state, t, toast, CHK } from './lk-core';
import { crClick, renderCreate, wireCreate } from './lk-create';
import { attention, draftFix, fbBody, fbFlag, fbHeatMap, fbRowForOpenPlan, loadFeedback, renderFeedback, renderSettings, showPlansTab, useFix } from './lk-feedback';
import { APPR_MAX, loadPoolPick, apprLevelName, apprStars, bankReady, fillFilterOptions, fmtDate, loadBank, loadUses, logUse, openShelf, renderBank, rowTitle, savePoolPick, stars, startBank, usesOf } from './lk-pool';
import { loadTerm, renderTermCoverage, renderTermStored, wireTerm } from './lk-term';
import { startWait, stopWait, waitHtml, waitSay } from './lk-wait';

// The pool shelf open last time; lk-core cannot read it before lk-pool is loaded.
state.pool = loadPoolPick();

function setLang(l: Lang) {
  setLangValue(l);
  try { localStorage.setItem('lk.lang', l); } catch { /* private window */ }
  document.documentElement.lang = l;
  applyStatic();
  renderNav();
  if (state.me) $('username').textContent = state.me.role === 'demo' ? t('demoRole') : state.me.role;
  const via = maybe$('userauth'); if (via) via.textContent = authLabel();
  renderRows();
  renderBank();
  // The to-do list holds labels (help kinds), so it is rebuilt in the new language.
  state.attn = attention();
  renderFeedback();
  renderSettings();
  fillFilterOptions();
  // The term tab builds its selects and grids from labels, so it is rebuilt.
  if (state.tab === 'term') loadTerm();
  setTitles();
  if (state.bodies) state.plan = pickBody();
  if (!$('overlay').hidden) {
    if (state.cr) renderCreate();
    else if (state.plan) showPlan();
    else if (state.row) showRequest();
  }
}

/** Everything marked data-t in the HTML. */
function applyStatic() {
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.getAttribute('data-t') || ''); });
  document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('on', b.getAttribute('data-lang') === LANG));
}

export function setTitles() {
  const onPlans = state.screen === 'plans';
  const onFb = onPlans && state.tab === 'feedback';
  $('pagetitle').textContent = onPlans ? t('titlePlans') : t('titleCover');
  $('pagesub').textContent = onFb
    ? state.pending + ' ' + t('toReview') + ' · ' + state.fb.length + ' ' + t('plansCount')
    : onPlans
    ? state.bank.length + ' ' + t('plansCount') + ' · ' + state.bank.filter((b) => b.shared).length + ' ' + t('sharedBetween')
    : new Date().toLocaleDateString(LANG === 'sv' ? 'sv-SE' : 'en-GB',
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/* ── Sidebar nav — FVK's items and icons ───────────── */
const ICONS: StrMap = {
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
  // One door for the add-on. The bank and the feedback queue are two views of
  // the same thing, and a second sidebar entry made it look like two features.
  { id: 'plans', icon: 'clipboard', key: 'navPlans', real: true, addon: true, badge: true },
  { id: 'hub',   icon: 'clipboard', key: 'navHub' },
  { id: 'radar', icon: 'radar',     key: 'navRadar' },
  { id: 'dash',  icon: 'grid',      key: 'navDashboard' },
  { id: 'set',   icon: 'settings',  key: 'navSettings' },
];

export function renderNav() {
  $('nav').innerHTML = NAV.map((n) => {
    const active = n.id === state.screen;
    const stroke = active ? '#0F71F6' : 'rgba(255,255,255,0.45)';
    return '<button data-nav="' + n.id + '"' + (active ? ' class="on"' : '') + '>' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + stroke +
      '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      ICONS[n.icon] + '</svg><span class="lbl">' + esc(t(n.key)) + '</span>' +
      (n.badge && state.pending ? '<span class="chip chip-warn" style="font-size:10px;padding:1px 6px">' + state.pending + '</span>' : '') +
      (n.addon && !(n.badge && state.pending) ? '<span class="chip chip-blue" style="font-size:10px;padding:1px 6px">' + esc(t('addon')) + '</span>' : '') +
      '</button>';
  }).join('');
}



/* ── Stand-in for FVK's cover feed ──────────────────
   Shape mirrors cover_assignments. When FVK is wired up these arrive
   in the lk:init message instead. */
const ROWS: Row[] = [
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



/* ── Sign-in: mocked (option A) ──────────────────────
   Lektionskollen is its own product with its own sign-in, and can be linked
   to Frånvarokollen. The plan (docs/AUTH.md):

     standalone  Supabase Auth on LK's own project — Google, Microsoft
                 (provider 'azure') or an emailed link
     linked      FVK's server mints a short-lived LK session for the signed-in
                 coordinator; the panel opens already signed in

   Nothing here talks to an identity provider yet. Every button lands in the
   shared demo school, exactly as before; the screen exists so the flow can be
   judged and the real calls dropped in at the marked lines without touching
   anything else. */
type AuthMethod = 'google' | 'microsoft' | 'email' | 'demo' | 'fvk';
interface MockAuth { method: AuthMethod; email?: string }
const AUTH_KEY = 'lk.mockAuth';

function mockAuth(): MockAuth | null {
  if (EMBED) return { method: 'fvk' };   // later: session handed over by FVK (setSession)
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch { return null; }
}

function showSignIn() {
  $('signin').hidden = false;
  applyStatic();
}

function mockSignIn(method: AuthMethod) {
  // Real calls, when the time comes:
  //   google     sb.auth.signInWithOAuth({ provider: 'google' })
  //   microsoft  sb.auth.signInWithOAuth({ provider: 'azure', options: { scopes: 'email' } })
  //   email      sb.auth.signInWithOtp({ email })
  //   then       lk_me() resolves the school from members; no member → "ask your coordinator"
  let email: string | undefined;
  if (method === 'email') {
    email = maybe$<HTMLInputElement>('si-email')?.value.trim() || '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast(t('siBadEmail')); return; }
  }
  try { localStorage.setItem(AUTH_KEY, JSON.stringify({ method, email })); } catch { /* private window */ }
  $('signin').hidden = true;
  boot();
}

function authLabel(): string {
  const a = mockAuth();
  if (!a) return '';
  return t('via_' + a.method) + (a.email ? ' · ' + a.email : '');
}

/** Settings: where the FVK link will live. Static until the bridge exists. */
export function fvkLinkCard() {
  return '<h4 style="margin-top:18px">' + esc(t('fvkLinkTitle')) + '</h4>' +
    '<p class="hint">' + esc(t('fvkLinkNote')) + '</p>' +
    '<div class="covrow"><span class="chip chip-neutral">' + esc(t(EMBED ? 'fvkLinked' : 'fvkNotLinked')) + '</span>' +
    (EMBED ? '' : '<button data-fvklink>' + esc(t('fvkLinkBtn')) + '</button>') + '</div>';
}

/* ── No login in the test env ───────────────────────
   The lk_* functions fall back to the shared demo school for anonymous
   callers. Revoking the anon grants in Postgres restores a real login
   without touching this file. */
function boot() {
  document.documentElement.lang = LANG;
  applyStatic();
  if (!mockAuth()) { showSignIn(); return; }
  renderNav();
  enterApp()
    .then(() => Promise.all([loadFeedback(), loadUses()]))
    .then(() => (EMBED ? openEmbed() : loadCoverPlans().then(renderRows)))
    .catch(() => {});
}

$('signout').addEventListener('click', () => {
  // later: await sb.auth.signOut()
  try { localStorage.removeItem(AUTH_KEY); } catch { /* private window */ }
  location.reload();
});

async function enterApp() {
  const { data, error } = await sb.rpc('lk_me');
  if (error) {
    document.body.innerHTML = '<p style="padding:40px;font:14px Geist,sans-serif">' + esc(t('errDb')) + ' ' + esc(error.message) + '</p>';
    return;
  }

  if (!data || !data.school_id) {
    document.body.innerHTML = '<p style="padding:40px;font:14px Geist,sans-serif">' + esc(t('noDemoSchool')) + '</p>';
    return;
  }

  state.me = data;
  $('app').hidden = false;
  $('schoolname').textContent = data.school;
  $('username').textContent = (data.role === 'demo' ? t('demoRole') : data.role);
  $('username').title = authLabel();
  const via = maybe$('userauth'); if (via) via.textContent = authLabel();
  $('pagesub').textContent = new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  renderRows();
  startBank();
}

/* ── Cover table ───────────────────────────────────── */

/* ── How loud should the add-on be? ──────────────────────
   The question this replica exists to answer. The same integration at three
   volumes, switchable live, so the choice is made by looking rather than by
   arguing:

     quiet   nothing on the grid at all; the plan is in the lesson popover,
             which is where the coordinator already goes to assign cover.
     marked  plus a dot on blocks that have a plan — ✓ approved, ○ draft.
     nudge   plus a line in the header counting covered lessons with no plan.

   Frånvarokollen's own screen is unchanged in all three: no new column, no
   new tab, nothing moved. */
let LOUD: string = (() => { try { return localStorage.getItem('lk.loud') || 'marked'; } catch { return 'marked'; } })();

function setLoud(v: string) {
  LOUD = v;
  try { localStorage.setItem('lk.loud', v); } catch { /* private window */ }
  renderRows();
  renderLoudPicker();
}

function renderLoudPicker() {
  const el = maybe$('cv-loud');
  if (!el) return;
  el.innerHTML = '<span class="lbl">' + esc(t('cvHow')) + '</span>' +
    ([['quiet', 'cvQuiet'], ['marked', 'cvMarked'], ['nudge', 'cvNudge']] as const).map(([v, k]) =>
      '<button class="' + (LOUD === v ? 'on' : '') + '" data-loud="' + v + '">' + esc(t(k)) + '</button>').join('') +
    '<span class="hint">' + esc(t('cvHowNote')) + '</span>';
}

/* ── What each cover slot has ────────────────────────────
   Most lessons are not waiting for a generated plan. A teacher emails "chapter
   4, exercises 1-8"; another keeps the week in a shared document; a third
   lesson is a test and needs nothing. One map answers the only question the
   screen asks — does the substitute have something to teach from? — with the
   source as a detail rather than the headline. */
let PLANS: Record<string, CoverPlan> = {};

function planFor(ref: string): CoverPlan | null { return PLANS[ref] || null; }

/** Is this slot settled, either way? Only unsettled slots are worth counting. */
function planSettled(ref: string) {
  const p = planFor(ref);
  return !!p;
}

async function loadCoverPlans() {
  const { data } = await sb.rpc('lk_cover_plans');
  PLANS = data || {};
}

/* ── The lesson popover ──────────────────────────────────
   Frånvarokollen's own, rebuilt: the cover pill, the notify menu, remove,
   and for an uncovered lesson the assign control. The add-on contributes the
   last item and nothing else. Disabled where the real one would act on real
   data — this replica is for judging placement, not for assigning cover. */
let POP: string | null = null;

function closePop() { POP = null; $('cv-pop').hidden = true; }

function openPop(ref: string, x: number, y: number) {
  const r = ROWS.find((b) => b.id === ref);
  if (!r) return;
  POP = ref;
  const plan = planFor(ref);
  const el = $('cv-pop');
  const planBtn = r.plannable ? planRow(r, plan) : '<p class="pnote">' + esc(t(r.whyKey || 'whyRast')) + '</p>';

  el.innerHTML =
    '<div class="pophead">' +
      '<p class="ph">' + esc([r.group, r.subject].filter(Boolean).join(' ') || r.raw) +
        (r.room ? '<span class="rm">' + esc(r.room) + '</span>' : '') + '</p>' +
      '<p class="pm">' + esc(t('cvWas')) + ': ' + esc(r.teacher) + ' • ' + esc(r.time) + ' • ' + r.mins + ' min</p>' +
    '</div>' +
    (r.cover
      ? '<div class="poprow"><span class="covpill">✓ ' + esc(r.cover) + '</span>' +
        '<span class="popicons"><button disabled title="' + esc(t('cvNotify')) + '">✉</button>' +
        '<button disabled title="' + esc(t('cvRemove')) + '">×</button></span></div>'
      : '<div class="poprow"><select disabled><option>' + esc(t('cvAssign')) + '</option></select></div>') +
    planBtn;

  el.hidden = false;
  // On a phone a 300px panel pinned to a finger lands half off the screen and
  // over the block it describes, so it docks to the bottom instead. Above that
  // width it follows the block, as Frånvarokollen's does.
  if (window.innerWidth < 640) { el.style.left = ''; el.style.top = ''; return; }
  const w = 300, hGuess = 190;
  el.style.left = Math.min(x, window.innerWidth - w - 12) + 'px';
  el.style.top = Math.min(y, window.innerHeight - hGuess - 12) + 'px';
}


/* ── What the machine can check, so a person does not have to ───
   A coordinator is not a chemist, a mathematician and a historian. Asking them
   to approve subject correctness gets approval on trust, which is no check at
   all. So the structural faults — a question with no answer, phases that do not
   add up, a missing key — are found here and shown plainly, and the coordinator
   is asked the question they can actually answer: can a substitute run this? */
async function checkPlan(id: string) {
  if (state.checks[id] !== undefined) return state.checks[id];
  try {
    // Only reached for a plan with no stored verdict: usePlan seeds
    // state.checks from the row, which skips this call on purpose. lk-verify
    // adds a subject pass on the strongest model, and paying for that on every
    // open of an already-checked plan is not worth it. The subject pass runs
    // for plans that have never been checked.
    const { data, error } = await sb.functions.invoke('lk-verify', { body: { plan_id: id } });
    state.checks[id] = error ? null : data;
  } catch {
    state.checks[id] = null;
  }
  return state.checks[id];
}

/** The verdict, as a line the coordinator can act on. */
function checkBanner(v: Verdict | null | undefined) {
  if (!v) return '';
  if (v.ok && !v.warnings) {
    return '<div class="flag chk ok"><span>✓</span><div>' + esc(t('chkClean')) +
      (v.subject_checked ? ' ' + esc(t('chkSubject')) : '') + '</div></div>';
  }
  const lines = (v.problems || []).map((p: CheckProblem) =>
    '<li class="' + (p.level === 'blocker' ? 'bad' : 'warn') + '"><b>' + esc(p.where) + '</b> — ' +
    esc(p.detail) + '</li>').join('');
  return '<div class="flag chk ' + (v.ok ? 'warn' : 'bad') + '"><span>' + (v.ok ? '!' : '✕') + '</span>' +
    '<div><b>' + esc(v.ok ? fillT('chkWarnings', { n: v.warnings })
                          : fillT('chkBlockers', { n: v.blockers })) + '</b> ' +
    esc(v.ok ? t('chkWarnBody') : t('chkBlockBody')) +
    '<ul class="chklist">' + lines + '</ul></div></div>';
}

/* ── The plan line ───────────────────────────────────────
   One row of the popover, in every state, so the add-on never dominates a
   card that is really about covering a lesson.

     nothing yet   three small choices: make one, link one, not needed
     linked        what it is and where it goes, with a way to change it
     generated     open it
     not needed    said once, quietly, with an undo

   Marking a lesson as needing no plan is not a dismissal of the feature; it
   is the answer that lets a coordinator finish. */
function planRow(r: Row, p: CoverPlan | null) {
  if (!p) {
    return '<div class="planrow"><span class="plbl">' + esc(t('cvMakePlan')) + '</span>' +
      '<button class="plopt" data-planopen="' + esc(r.id) + '">' + esc(t('cvPlMake')) + '</button>' +
      '<button class="plopt" data-planlink="' + esc(r.id) + '">' + esc(t('cvPlLink')) + '</button>' +
      '<button class="plopt quiet" data-plannot="' + esc(r.id) + '">' + esc(t('cvPlNot')) + '</button></div>';
  }
  if (p.kind === 'not_needed') {
    return '<div class="planrow done"><span class="plbl">' + esc(t('cvPlNotSet')) + '</span>' +
      '<button class="plopt quiet" data-planclear="' + esc(r.id) + '">' + esc(t('cvPlUndo')) + '</button></div>';
  }
  if (p.kind === 'generated') {
    return '<button class="planbtn ' + (p.approved ? 'done' : 'draft') + '" data-planopen="' + esc(r.id) + '">' +
      '<span>' + (p.approved ? '✓' : '📄') + '</span>' +
      esc(p.approved ? t('cvOpenPlan') : t('cvPlReview')) + '</button>';
  }
  // The teacher's own: a link or a few typed lines.
  const what = p.label || (p.kind === 'note' ? t('cvPlNoteKind') : hostOf(p.url) || t('cvPlLinkKind'));
  const expLine = p.expires_at
    ? '<div class="planrow"><span class="plbl">' + esc(p.expired ? t('cvPlExpired')
        : t('cvPlUntil') + ' ' + new Date(new Date(p.expires_at).getTime() - 1000).toLocaleDateString(LANG === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short' })) + '</span>' +
      (p.expired ? '' : '<button class="plopt quiet" data-planextend="' + esc(r.id) + '">' + esc(t('cvPlExtend')) + '</button>') + '</div>' : '';
  return '<button class="planbtn linked" data-planopen="' + esc(r.id) + '">' +
      '<span>🔗</span>' + esc(t('cvPlTeachers')) + ' — ' + esc(what) + '</button>' + expLine +
    '<div class="planrow"><button class="plopt quiet" data-planlink="' + esc(r.id) + '">' + esc(t('cvPlChange')) + '</button>' +
      '<button class="plopt quiet" data-planclear="' + esc(r.id) + '">' + esc(t('cvPlRemove')) + '</button></div>';
}

function hostOf(url: string | undefined) {
  try { return new URL(url || '').hostname.replace(/^www\./, ''); } catch { return null; }
}

/* ── Linking the teacher's own plan ──────────────────────
   Deliberately two fields. Most of these arrive as a sentence in an email, so
   typing it is often faster than finding a document to link, and a substitute
   reads it the same either way. */
function openLinkBox(ref: string) {
  const r = ROWS.find((b) => b.id === ref);
  if (!r) return;
  const p: Partial<CoverPlan> = planFor(ref) || {};
  closePop();
  $('linkbox').innerHTML =
    '<div class="lbx">' +
      '<h3>' + esc(t('cvPlLinkTitle')) + '</h3>' +
      '<p class="hint">' + esc(blockTitle(r)) + ' · ' + esc(r.time) + ' · ' + esc(r.teacher) + '</p>' +
      '<label class="f full">' + esc(t('cvPlUrl')) +
        '<input id="lb-url" type="url" placeholder="https://…" value="' + esc(p.url || '') + '"></label>' +
      '<p class="linkstate" id="lb-state" hidden></p>' +
      '<label class="f full">' + esc(t('cvPlNoteLbl')) +
        '<textarea id="lb-note" rows="3" placeholder="' + esc(t('cvPlNotePh')) + '">' + esc(p.note || '') + '</textarea></label>' +
      '<label class="f full">' + esc(t('cvPlLabel')) +
        '<input id="lb-label" maxlength="60" placeholder="' + esc(t('cvPlLabelPh')) + '" value="' + esc(p.label || '') + '"></label>' +
      '<p class="hint">' + esc(t('cvPlWrapNote')) + '</p>' +
      '<div class="lbxfoot"><button class="btn btn-ghost btn-sm" data-lbcancel>' + esc(t('cancel')) + '</button>' +
        '<button class="btn btn-primary btn-sm" data-lbsave="' + esc(ref) + '">' + esc(t('save')) + '</button></div>' +
    '</div>';
  $('linkbox').hidden = false;
  const urlField = $<HTMLInputElement>('lb-url');
  urlField.addEventListener('blur', () => checkLink(urlField.value));
  if (p.url) checkLink(p.url);
}

/* ── Is this link any good? ──────────────────────────────
   Checked when the coordinator pastes it, because they are the only person
   who can fix it — the substitute meets it at 08:15 with no way to put it
   right. Advice, never a gate: they may well know the link is fine and the
   checker wrong.

   What it cannot tell us is said out loud rather than papered over. A private
   document answers with a perfectly healthy sign-in page, so "reachable" never
   means "the substitute will get in". */
async function checkLink(url: string) {
  const box = maybe$('lb-state');
  if (!box) return;
  const u = (url || '').trim();
  if (!u) { box.hidden = true; return; }
  box.hidden = false;
  box.className = 'linkstate busy';
  box.textContent = t('lkChecking');
  let r: { status?: string; reason?: string };
  try {
    const { data, error } = await sb.functions.invoke('lk-checklink', { body: { url: u } });
    r = error ? { status: 'unreachable' } : data;
  } catch {
    r = { status: 'unreachable' };
  }
  const map: Record<string, [string, string]> = {
    ok: ['ok', 'lkOk'],
    missing: ['bad', 'lkMissing'],
    private: ['warn', 'lkPrivate'],
    slow: ['warn', 'lkSlow'],
    unreachable: ['warn', 'lkUnreachable'],
    bad: ['bad', r && r.reason === 'not_http' ? 'lkNotHttp' : r && r.reason === 'private_address' ? 'lkPrivateAddr' : 'lkNotUrl'],
  };
  const m = map[(r && r.status) || 'unreachable'] || map.unreachable!;
  box.className = 'linkstate ' + m[0];
  box.textContent = t(m[1]);
}

async function saveLink(ref: string) {
  const url = $<HTMLInputElement>('lb-url').value.trim();
  const note = $<HTMLTextAreaElement>('lb-note').value.trim();
  const label = $<HTMLInputElement>('lb-label').value.trim();
  if (!url && !note) { toast(t('cvPlNeedOne')); return; }
  // Web addresses only: anything else is not a lesson plan, and some schemes
  // would run code on the substitute's page.
  if (url && !/^https?:\/\//i.test(url)) { toast(t('cvPlNeedHttp')); return; }
  const { error } = await sb.rpc('lk_set_cover_plan', {
    p_absence_ref: ref, p_kind: url ? 'linked' : 'note',
    p_url: url || null, p_note: note || null, p_label: label || null,
  });
  if (error) { toast(error.message); return; }
  $('linkbox').hidden = true;
  await loadCoverPlans();
  renderRows();
  toast(t('cvPlSaved'));
}

/* ── The Lektionskollen panel ────────────────────────────
   What the drop-in component renders: a right-hand drawer over the cover
   screen, our app inside it in embed mode. Here it is the same overlay the
   rest of this prototype uses, dressed as that drawer, so the feel is right
   without a second copy of the plan UI. */
function openPlanPanel(ref: string) {
  const r = ROWS.find((b) => b.id === ref);
  if (!r) return;
  const p = planFor(ref);
  // The teacher's own plan has its own page — the same one the substitute
  // gets, so the coordinator sees exactly what they will see.
  if (p && (p.kind === 'linked' || p.kind === 'note')) {
    closePop();
    window.open(planUrl(p.share_token), '_blank', 'noopener');
    return;
  }
  closePop();
  document.body.classList.add('panelmode');
  // "Open lesson plan" has to open the plan. Only a slot with nothing on it
  // yet starts at the request form.
  if (p && p.kind === 'generated' && p.plan_id) {
    usePlan(p.plan_id, r);
    return;
  }
  openAddin(ref);
}

/* ── Daily Cover ─────────────────────────────────────────
   A replica of Frånvarokollen's cover screen, close enough to judge the
   add-on inside it: the coverage donut, the absent-staff chips, and the
   timeline grid with one column per absent teacher and lessons positioned
   by time. The block colours are FVK's own — green covered, amber
   uncovered, red cancelled — and a block carries only what fits at its
   height, as theirs does.

   The add-on adds nothing to this screen. A lesson block is 22-60px tall
   and has no room for a button, so the plan lives one click deep, in the
   popover the coordinator already opens to assign cover. */

const GRID = { gutter: 54, colMin: 150, pxPerHour: 76 };

function hhmmToMins(t: string | undefined) {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Lessons that need a substitute, grouped into a column per absent teacher. */
interface Col { teacher: string; blocks: Row[] }
interface Grid { cols: Col[]; from: number; to: number; span: number; marks: number[] }
function gridModel(): Grid {
  const cols: Col[] = [];
  ROWS.forEach((r) => {
    let c = cols.find((x) => x.teacher === r.teacher);
    if (!c) { c = { teacher: r.teacher, blocks: [] }; cols.push(c); }
    c.blocks.push(r);
  });
  const all = ROWS.map((r) => [hhmmToMins(r.start), hhmmToMins(r.end)] as const);
  const from = Math.floor(Math.min(...all.map((x) => x[0])) / 60) * 60;
  const to = Math.ceil(Math.max(...all.map((x) => x[1])) / 60) * 60;
  const marks: number[] = [];
  for (let m = from; m <= to; m += 60) marks.push(m);
  return { cols, from, to, span: Math.max(1, to - from), marks };
}

function coverageStats() {
  const plannable = ROWS.filter((r) => r.plannable);
  const covered = plannable.filter((r) => r.cover).length;
  const teachers = new Set(ROWS.map((r) => r.teacher)).size;
  return {
    total: plannable.length,
    covered,
    uncovered: plannable.length - covered,
    absent: teachers,
    pct: plannable.length ? Math.round((covered / plannable.length) * 100) : 0,
  };
}

/** FVK's donut: a red ring with the covered share drawn over it in green. */
function donut(pct: number) {
  const size = 72, sw = 7, r = (size - sw) / 2, c = 2 * Math.PI * r;
  return '<circle cx="36" cy="36" r="' + r + '" fill="none" stroke="' + (pct === 0 ? '#e5e7eb' : '#fecaca') + '" stroke-width="' + sw + '"/>' +
    (pct > 0
      ? '<circle cx="36" cy="36" r="' + r + '" fill="none" stroke="#16a34a" stroke-width="' + sw +
        '" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - pct / 100)) +
        '" stroke-linecap="round" transform="rotate(-90 36 36)"/>'
      : '') +
    '<text x="36" y="32" text-anchor="middle" font-size="20" font-weight="700" fill="var(--ink)">' + pct + '%</text>' +
    '<text x="36" y="48" text-anchor="middle" font-size="8" font-weight="600" fill="' +
      (pct >= 100 ? '#16a34a' : 'var(--ink-soft)') + '" letter-spacing="0.5">' +
      esc(t('cvCovered').toUpperCase()) + '</text>';
}

function renderRows() {
  const st = coverageStats();
  const d = new Date('2026-10-21T12:00:00');
  const loc = LANG === 'sv' ? 'sv-SE' : 'en-GB';
  $('cv-kicker').textContent = t('cvToday') + ' · ' + t('cvWeek') + ' 43';
  $('cv-day').innerHTML = esc(d.toLocaleDateString(loc, { weekday: 'long' })) +
    ' <b>' + d.getDate() + '</b> ' + esc(d.toLocaleDateString(loc, { month: 'long' }));
  $('cv-donut').innerHTML = donut(st.pct);
  $('cv-need').textContent = st.uncovered
    ? st.uncovered + ' ' + t(st.uncovered === 1 ? 'cvLesson' : 'cvLessons') + ' ' + t('cvNeedCover')
    : t('cvAllCovered');
  $('cv-counts').textContent =
    st.absent + ' ' + t('cvAbsent') + ' · ' + st.total + ' ' + t('cvLessons') + ' · ' + st.covered + ' ' + t('cvCovered');

  // Absent staff, one card each, with how far their day is covered.
  const g = gridModel();
  $('cv-chips').innerHTML = g.cols.map((c) => {
    const mine = c.blocks.filter((b) => b.plannable);
    const cov = mine.filter((b) => b.cover).length;
    const all = mine.length > 0 && cov === mine.length;
    return '<div class="schip' + (all ? ' done' : '') + '">' +
      '<span class="sname">' + esc(c.teacher) + '</span>' +
      (mine.length
        ? '<span class="sstat' + (all ? ' ok' : '') + '">' + (all ? '✓ ' + esc(t('cvChipCovered')) : cov + '/' + mine.length + ' ' + esc(t('cvChipCoveredN'))) + '</span>' +
          '<span class="sbar"><i class="' + (all ? 'ok' : '') + '" style="width:' + Math.round(cov / mine.length * 100) + '%"></i></span>'
        : '<span class="sstat">' + esc(t('cvChipAbsent')) + '</span>') +
      (all ? '<span class="stick">✓</span>' : '') + '</div>';
  }).join('');

  // The nudge: covered lessons whose substitute has nothing to teach from.
  // Only slots nobody has decided on. A coordinator who can never clear the
  // list stops reading it.
  const gap = ROWS.filter((r) => r.plannable && r.cover && !planSettled(r.id)).length;
  $('cv-nudge').hidden = !(LOUD === 'nudge' && gap > 0);
  if (LOUD === 'nudge' && gap > 0) {
    $('cv-nudge').innerHTML = '<span>📄</span><div>' +
      esc(fillT('cvGapLine', { n: gap === 1 ? t('cvGap1') : fillT('cvGapN', { n: gap }) })) + '</div>' +
      '<button class="btn btn-soft btn-sm" data-planfirst>' + esc(t('cvGapBtn')) + '</button>';
  }
  renderLoudPicker();

  // The grid itself.
  const h = Math.round(g.span / 60 * GRID.pxPerHour);
  const top = (m: number) => ((m - g.from) / g.span) * 100;
  const lines = g.marks.map((m) => '<div class="hline" style="top:' + top(m) + '%"></div>').join('');

  $('cv-grid').style.minWidth = (GRID.gutter + g.cols.length * GRID.colMin) + 'px';
  $('cv-grid').innerHTML =
    '<div class="gutter" style="width:' + GRID.gutter + 'px">' +
      '<div class="colhead"></div><div class="canvas" style="height:' + h + 'px">' +
      g.marks.map((m) => '<span class="hmark" style="top:calc(' + top(m) + '% - 6px)">' + minsToHHMM(m) + '</span>').join('') +
      '</div></div>' +
    '<div class="cols">' + g.cols.map((c) =>
      '<div class="col" style="min-width:' + GRID.colMin + 'px">' +
        '<div class="colhead"><span>' + esc(c.teacher) + '</span></div>' +
        '<div class="canvas" style="height:' + h + 'px">' + lines +
        c.blocks.map((b) => blockHtml(b, g, h)).join('') +
        '</div></div>').join('') + '</div>';
}

/** What a block calls itself. Break duty and working time have no class or
 *  subject, so they show the timetable's own word for them. */
function blockTitle(b: Row) {
  const parts = [b.group, b.subject].filter((x) => x && x !== '—');
  return parts.length ? parts.join(' ') : b.raw;
}

/** The one glyph a block can spare. Nothing for a slot nobody has decided on,
 *  and nothing for one deliberately marked as needing no plan: a grid that
 *  marks everything marks nothing. */
function planMark(p: CoverPlan) {
  const marks: Record<string, string[] | null> = { generated: p.approved ? ['✓', 'ok', 'cvHasPlan'] : ['○', '', 'cvPlanDraft'],
              linked: ['🔗', 'ok', 'cvHasLinked'],
              note: ['🔗', 'ok', 'cvHasNote'],
              authored: ['✓', 'ok', 'cvHasLinked'],
              not_needed: null };
  const m = marks[p.kind];
  if (!m) return '';
  return '<span class="bplan ' + m[1] + '" title="' + esc(t(m[2]!)) + '">' + m[0] + '</span>';
}

function minsToHHMM(m: number) {
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

/** One lesson. Status decides the colour; height decides how much it can say. */
function blockHtml(b: Row, g: Grid, gridH: number) {
  const s = hhmmToMins(b.start), e = hhmmToMins(b.end);
  const topPct = ((s - g.from) / g.span) * 100;
  const hPct = ((e - s) / g.span) * 100;
  const px = hPct / 100 * gridH;
  const status = !b.plannable ? 'nonteach' : b.cover ? 'covered' : 'uncovered';
  const plan = planFor(b.id);
  return '<div class="blk ' + status + '" role="button" tabindex="0" data-blk="' + esc(b.id) + '"' +
    ' style="top:calc(' + topPct + '% + 1px);height:calc(' + hPct + '% - 3px);min-height:22px"' +
    ' title="' + esc([b.group, b.subject].filter(Boolean).join(' ') + ' · ' + b.time + (b.cover ? ' · ✓ ' + b.cover : '')) + '">' +
    '<p class="bt">' + esc(blockTitle(b)) + '</p>' +
    (px >= 34 ? '<p class="bm">' + esc(b.time) + '</p>' : '') +
    (px >= 48 && b.cover ? '<p class="bc">✓ ' + esc(b.cover) + '</p>' : '') +
    (plan && LOUD !== 'quiet' && px >= 30 ? planMark(plan) : '') +
    '</div>';
}



/* ── Add-in ────────────────────────────────────────── */

/** The substitute's link for a plan. Built from this page's own location so it
 *  is right on GitHub Pages, on a school's own host, and inside an embed panel
 *  (where the query string must not leak into the link). */
function planUrl(token: string | null | undefined) {
  const base = location.origin + location.pathname.replace(/[^/]*$/, '') + 'plan.html?';
  // "r:" marks a class link: one delivery of a plan to one class, with its own
  // expiry and its own feedback. Anything else is the plan's own link.
  return String(token).startsWith('r:') ? base + 'r=' + String(token).slice(2) : base + 't=' + token;
}

/** The link to give a substitute for the lesson on screen: the class's own when
 *  this plan has been given to this class, otherwise the plan's general link. */
function subLinkToken() {
  const g = state.row?.group;
  const u = g && g !== '—' && state.planId ? usesOf(state.planId, g)[0] : null;
  return u && u.run_token ? 'r:' + u.run_token : state.shareToken;
}

/* ── Embed mode ─────────────────────────────────────────
   Frånvarokollen opens this app in a panel beside its cover screen, passing the
   lesson it is standing on. There is no second login and no duplicated plan UI:
   the same screens the coordinator already knows, with the chrome hidden.

   The lesson arrives in the query string rather than through postMessage so the
   panel survives a reload and can be opened in a tab for debugging. Nothing
   about a pupil is ever passed; the parameters below are the whole contract.

     ?embed=1&ref=<cover key>&subject=&year=&group=&mins=&start=&end=&room=
     &teacher=<absent teacher>&cover=<substitute>&lang=sv|en

   Back to the parent go two messages, both namespaced: lk:ready once the panel
   is up, and lk:plan when a plan is approved, carrying the share link that
   Frånvarokollen puts in its cover notification. */
const EMBED = (() => {
  const q = new URLSearchParams(location.search);
  if (q.get('embed') !== '1') return null;
  const num = (k: string, d: number) => { const n = parseInt(q.get(k) || '', 10); return Number.isFinite(n) ? n : d; };
  return {
    row: {
      id: q.get('ref') || '',
      subject: q.get('subject') || '—',
      year: q.get('year') || '',
      group: q.get('group') || '',
      raw: q.get('code') || q.get('subject') || '',
      mins: num('mins', 45),
      start: q.get('start') || '',
      end: q.get('end') || '',
      time: [q.get('start'), q.get('end')].filter(Boolean).join('–'),
      room: q.get('room') || '—',
      teacher: q.get('teacher') || '—',
      cover: q.get('cover') || null,
      practical: q.get('practical') === '1',
      plannable: true,
    } as Row,
  };
})();

/** Tell Frånvarokollen what happened. Same-origin parents get nothing extra;
 *  the targetOrigin stays '*' because the panel holds no secret worth guarding
 *  — the share link it reports is one the coordinator is about to email anyway. */
function toParent(type: string, payload: Record<string, unknown>) {
  if (!EMBED || window.parent === window) return;
  try { window.parent.postMessage({ source: 'lektionskollen', type, ...payload }, '*'); } catch { /* cross-origin */ }
}

/** Open the request straight onto the lesson Frånvarokollen passed. */
function openEmbed() {
  if (!EMBED) return;
  document.body.classList.add('embed');
  state.row = EMBED.row;
  state.plan = null; state.planId = null; state.view = 'coordinator';
  $('overlay').hidden = false;
  // enterApp already started the bank; draw the form once it is in, so the
  // matches are there and nothing the user has started is redrawn under them.
  const seq = ++panelSeq;
  bankReady.then(() => { if (seq === panelSeq && !state.planId) showRequest(); });
  toParent('lk:ready', { ref: EMBED.row.id });
}

function openAddin(id: string) {
  panelSeq++;
  state.row = ROWS.find((x) => x.id === id) || null;
  state.plan = null; state.planId = null; state.view = 'coordinator'; state.pshare = null;
  // The pool then opens on this absence's shelf, which is the one the
  // coordinator is most likely to go looking in next.
  if (state.row) { state.pool.sub = canonSubject(state.row.subject); state.pool.yr = canonYear(state.row.year); savePoolPick(); }
  $('overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  showRequest();
}
function closeAddin() {
  stopWait();
  panelSeq++;
  state.cr = null;
  if (EMBED) { toParent('lk:close', {}); return; }
  // The absence this panel was about is over; a plan opened next from the
  // bank must not inherit its class, time or substitute.
  state.row = null;
  $('overlay').hidden = true;
  document.body.style.overflow = '';
  document.body.classList.remove('panelmode');
  if (state.screen === 'cover') loadCoverPlans().then(renderRows).catch(() => {});
}

function showRequest() {
  const r = state.row;
  if (!r) return;
  $('seam-state').textContent = 'lk:init';
  // Same folding the pool uses, so "Idrott" / "åk 7" from FVK still match.
  const matches = state.bank.filter((b) => canonSubject(b.subject) === canonSubject(r.subject) &&
    canonYear(b.year_group) === canonYear(r.year) && b.approved);
  $('addin-content').innerHTML =
  '<div class="addin-body">' +
    '<div class="addin-head"><div style="flex:1;min-width:0">' +
      '<h2 id="addin-title">' + esc(t('planFor')) + ' ' + esc(r.group) + '</h2>' +
      '<div class="plan-meta">' + esc(r.teacher) + ' · ' + esc(r.time) + ' · ' + esc(r.room) +
      (r.cover ? ' · ' + esc(r.cover) : ' · ' + esc(t('uncovered').toLowerCase())) + '</div></div>' +
      '<button class="x" data-close aria-label="' + esc(t('close')) + '">✕</button></div>' +

    '<div class="derived">' +
      '<div><dt>' + esc(t('subjectLbl')) + '</dt><dd>' + esc(subjectLabel(r.subject)) + '</dd><div class="from">' + esc(t('fromCode')) + ' "' + esc(r.raw) + '"</div></div>' +
      '<div><dt>' + esc(t('yearLbl')) + '</dt><dd>' + esc(yearLabel(r.year)) + '</dd><div class="from">' + esc(t('derivedFrom')) + ' "' + esc(r.group) + '"</div></div>' +
      '<div><dt>' + esc(t('lengthLbl')) + '</dt><dd>' + r.mins + ' ' + esc(t('min')) + '</dd><div class="from">' + esc(r.start) + '–' + esc(r.end) + '</div></div>' +
    '</div>' +

    (r.practical ? '<div class="flag"><span>⚠</span><div><b>' + esc(t('practicalWarn')) + '</b> ' + esc(t('practicalBody')) + '</div></div>' : '') +

    (matches.length
      ? '<div><div class="sect-h">' + esc(t('fromBank')) + ' — ' + matches.length + ' ' + esc(matches.length === 1 ? t('bankApproved') : t('bankApprovedPl')) + '</div><div class="bankrow">' +
        matches.map((b) => { const had = usesOf(b.id, r.group); return '<button class="bankcard' + (had.length ? ' hadit' : '') + '" data-usebank="' + b.id + '">' +
          '<div style="flex:1;min-width:0"><div class="t">' + esc(rowTitle(b)) + '</div>' +
          '<div class="m">' + b.minutes + ' ' + esc(t('min')) + ' · ' + b.rating_count + ' ' + esc(t('ratings')) + (b.shared ? ' · ' + esc(t('sharedTag')) : '') + '</div>' +
          (had.length ? '<div class="hadwarn">⚠ ' + esc(fillT('hadIt', { g: r.group, d: fmtDate(had[0]!.used_on) })) + '</div>' : '') + '</div>' +
          '<span class="stars">' + stars(b.rating) + '</span>' +
          '<span class="btn btn-soft btn-sm">' + esc(t('use')) + '</span></button>'; }).join('') + '</div></div>'
      : '<div><div class="sect-h">' + esc(t('fromBank')) + '</div><p class="hint">' + esc(t('bankNone')) + ' ' + esc(subjectLabel(r.subject)) + ' ' + esc(yearLabel(r.year)) + ' ' + esc(t('bankNoneTail')) +
        (EMBED ? '' : ' <button class="btn btn-ghost btn-sm" data-poolgo>' + esc(t('poolBrowse')) + ' →</button>') + '</p></div>') +

    (matches.length ? '<details class="steerbox"><summary>' + esc(t('noFit')) + '</summary>' : '') +
    '<div><div class="sect-h">' + esc(t('steer')) + '</div><div class="steer">' +
      '<label class="f full">' + esc(t('fTopic')) + '<input id="s-topic" placeholder="' + esc(t('fTopicPh')) + '"></label>' +
      '<label class="f full">' + esc(t('fNotes')) + '<textarea id="s-notes" rows="2" placeholder="' + esc(t('fNotesPh')) + '"></textarea></label>' +
      // One choice left, from four. The other three asked the coordinator to
      // decide things that belong to whoever ends up reading the plan, and that
      // the plan can carry all of at once:
      //   difficulty          -> three task tiers, picked in the plan
      //   subject knowledge   -> the depth switch, picked in the plan
      //   plan language       -> both are always generated; the plan toggles
      // "New material" is gone too: a substitute who may not know the subject
      // cannot teach it in small steps and re-teach what does not land. When a
      // class genuinely must start something new, the class teacher links their
      // own plan instead.
      '<label class="f">' + esc(t('fType')) + '<select id="s-type">' +
        (r.practical ? ['typeTheory', 'typeContinue', 'typePractical'] : ['typeRevision', 'typeDeep', 'typeQuiet'])
          .map((k) => '<option>' + esc(t(k)) + '</option>').join('') +
      '</select></label>' +
      '<p class="hint full" style="margin:2px 0 0">' + esc(t('fTypeHint')) + '</p>' +
      '<div class="full"><div class="sect-h" style="margin-bottom:6px">' + esc(t('fRes')) + '</div><div class="chips">' +
        ['resWhiteboard', 'resProjector', 'resComputers', 'resBooks', 'resMini']
          .map((k, i) => '<button class="tog' + (i === 0 ? ' on' : '') + '" data-res>' + esc(t(k)) + '</button>').join('') +
      '</div></div>' +
    '</div></div>' +
    (matches.length ? '</details>' : '') +

    '<div class="foot"><span class="hint">' + esc(t('privacyNote')) + '</span>' +
      '<span class="spacer"></span><button class="btn btn-ghost" data-close>' + esc(t('cancel')) + '</button>' +
      '<button class="btn ' + (matches.length ? 'btn-ghost' : 'btn-primary') + '" data-generate>' + esc(t('create')) + '</button></div>' +
  '</div>';
}

function gatherRequest() {
  const r = state.row;
  if (!r) throw new Error('no lesson selected');
  return {
    absence_ref: r.id,
    subject: r.subject,
    year_group: r.year,
    group_name: r.group,
    room: r.room,
    starts_at: r.start,
    ends_at: r.end,
    minutes: r.mins,
    topic: maybe$<HTMLInputElement>('s-topic')?.value || '',
    notes: maybe$<HTMLTextAreaElement>('s-notes')?.value || '',
    lesson_type: maybe$<HTMLSelectElement>('s-type')?.value || '',
    // Always both languages: lk-generate writes one and translates it, so the
    // plan carries sv and en and the reader toggles.
    language: 'sv',
    resources: [...document.querySelectorAll('[data-res].on')].map((b) => b.textContent),
  };
}

/** Bumped whenever the panel changes subject (opened, closed, another plan).
 *  An await that comes back to a different value is answering a question
 *  nobody is asking any more, and must not touch the screen. */
let panelSeq = 0;

/** lk-generate, with its answer readable on failure too. supabase-js hands back
 *  data: null for any non-2xx, so the function's code (quota, no_model …) was
 *  lost and the coordinator saw "non-2xx status code". The body is still on
 *  the response; read it. */
export async function invokeGen(body: Record<string, unknown>): Promise<{ data: any; error: any }> {
  const r = await sb.functions.invoke('lk-generate', { body });
  if (r.error && !r.data) {
    try {
      const ctx = (r.error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') return { data: await ctx.json(), error: r.error };
    } catch { /* not JSON: keep the error as it is */ }
  }
  return r;
}

/** One sentence for whatever lk-generate said went wrong, in the reader's language. */
export function genErrText(data: any, error: any): string {
  const code = String(data?.error || '');
  if (code === 'no_model') return t('errNoModel');
  if (code === 'quota') return fillT('errQuota', { n: data?.limit ?? '' });
  if (code === 'bad_output') return t('errBadOutput');
  if (code === 'no_school') return t('errNoSchool');
  if (code === 'too_large') return t('errTooLarge');
  // Anything else from the function is English and technical; the reader gets
  // the plain sentence, the console gets the detail.
  if (code || error) console.warn('lk-generate', code, data?.detail, error);
  return t('errUnknown');
}


async function generate() {
  const req = gatherRequest();
  // Remember which lesson this is for: the answer arrives a minute or two
  // later, by which time the panel may be closed or on another lesson.
  const seq = ++panelSeq, row = state.row;
  const stillHere = () => seq === panelSeq && state.row === row;
  $('seam-state').textContent = t('seamGenerating');
  $('addin-content').innerHTML = waitHtml(t('genCalling'));
  startWait();

  // Both languages, so whoever opens the plan reads it in theirs. One
  // generation, then the other language is a translation of it: cheaper than
  // a second generation and the two stay the same lesson. (With no model set
  // the generator says so and nothing is saved.)
  const other: Lang = req.language === 'en' ? 'sv' : 'en';
  const main = await invokeGen({ request: req });
  let alt: { error: unknown; data?: any } = { error: new Error('skipped') };
  if (!main.error && !main.data?.error) {
    waitSay(t('genTranslating'));
    alt = await invokeGen({ request: { ...req, language: other }, translate: main.data.source === 'model' ? main.data.plan : undefined });
  }
  if (!stillHere()) return;
  stopWait();

  if (main.error || main.data?.error) {
    // The function answers with a code, not a sentence: it has no idea which
    // language the coordinator reads. A code on screen helps nobody, so the
    // ones we expect become a sentence that says what to do instead.
    const msg = genErrText(main.data, main.error);
    $('addin-content').innerHTML =
      '<div class="addin-body"><div class="addin-head"><h2>' + esc(t('failed')) + '</h2>' +
      '<button class="x" data-close aria-label="' + esc(t('close')) + '">✕</button></div>' +
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
  if (!stillHere()) { loadBank(); return; }   // saved; just not shown over another lesson

  const bodies: Partial<Record<Lang, Plan>> = { [req.language]: main.data.plan };
  if (altPlan) bodies[other] = altPlan;
  state.bodies = bodies;
  state.plan = pickBody();
  state.planId = pid || null;
  state.approved = false;
  applyApproval({});
  state.shareToken = null;
  state.pshare = null;            // a fresh plan: nothing to share yet
  state.view = 'coordinator';     // and it is reviewed before anyone sees it
  state.model = main.data.model || null;
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

/** One place that copies a plan's approval onto the open-plan state. */
function applyApproval(d: Record<string, any>) {
  state.approved = !!d.approved;
  state.apprRank = Number(d.approval_rank) || 0;
  state.apprBy = d.approved_name || null;
  state.apprSubject = d.approved_subject || null;
  state.apprStale = !!d.approval_stale;
}

/** The name is saved with the approval. Remembered on this device so the
 *  second plan of the morning does not ask again. */
export const APPROVER_KEY = 'lk_approver';
function apprNameValue() {
  if (state.apprName != null) return state.apprName;
  try { return localStorage.getItem(APPROVER_KEY) || ''; } catch { return ''; }
}

const APPR_RUNGS: [number, string, string, string][] = [[1, 'coordinator', 'apprCoord', 'btn-ghost'],
                    [2, 'teacher', 'apprTeacher', 'btn-ok'],
                    [3, 'qualified', 'apprQualified', 'btn-primary']];
export const APPR_ERR: StrMap = { gate_closed: 'errGate', already_approved: 'errAlready', name_required: 'errName', has_blockers: 'errBlockers' };

function apprButtons(rank: number) {
  return APPR_RUNGS.filter((r) => r[0] > rank).map((r) =>
    '<button class="btn ' + r[3] + ' btn-sm" data-approve="' + r[1] + '">' +
    apprStars(r[0], '', true) + ' ' + esc(t(r[2])) + '</button>').join('');
}

/** The ladder, where the coordinator arrives. Only rungs above the one the plan
 *  already holds are offered, and at the top the bar is gone: the gate is
 *  closed until the plan changes. */
function approveBar() {
  const rank = state.apprRank || 0;
  if (rank >= APPR_MAX) return '';
  const fresh = !state.approved;
  return '<div class="approvebar' + (fresh ? '' : ' raise') + '"><div>' +
    (fresh
      ? '<b>' + esc(t('coordAsk')) + '</b> ' + esc(t('apBody')) +
        '<br><span class="hint">' + esc(t('coordAskNote')) + '</span>'
      : '<b>' + esc(rank ? fillT('apRaise', { l: apprLevelName(rank) }) : t('apReapprove')) + '</b> ' + esc(t('apRaiseBody'))) +
    '<br><span class="hint">' + esc(t('apprKindNote')) + '</span>' +
    '<label class="aprname"><span>' + esc(t('apprNameLabel')) + '</span>' +
      '<input id="apr-name" type="text" maxlength="80" autocomplete="name" placeholder="' +
      esc(t('apprNamePh')) + '" value="' + esc(apprNameValue()) + '"></label>' +
    '</div><div class="ladder">' + apprButtons(rank) + '</div></div>';
}

/** "★★☆ Teacher · Engelska — approved by Tom", for the line under a plan. */
function apprSignedLine() {
  const rank = state.apprRank || 0;
  if (!rank) return '';
  return apprStars(rank) + ' ' + esc(apprLevelName(rank) +
    (rank >= 2 && state.apprSubject ? ' · ' + subjectLabel(state.apprSubject) : '')) +
    (state.apprBy ? ' — ' + esc(fillT('apprSignedBy', { n: state.apprBy })) : '') +
    (rank >= APPR_MAX ? ' ' + esc(t('apprLocked')) : '');
}

/** Open a plan. `row` is the lesson it is being opened FOR — an absence —
 *  or null when it is opened on its own (bank, feedback, a new plan), in which
 *  case the plan stands alone and no class, time or substitute is implied. */
export async function usePlan(id: string, row: Row | null = null): Promise<boolean> {
  const seq = ++panelSeq;
  const { data, error } = await sb.rpc('lk_plan', { p_id: id });
  if (seq !== panelSeq) return false;
  if (error || !data) { toast(t('errOpen')); return false; }
  state.view = 'coordinator';
  const bodies: Partial<Record<Lang, Plan>> = { [data.language || 'sv']: data.body };
  if (data.body_alt && data.language_alt) bodies[data.language_alt as Lang] = data.body_alt;
  state.bodies = bodies;
  state.plan = pickBody();
  state.planId = data.id;
  applyApproval(data);
  state.pshare = data.origin ? { origin: data.origin, author: data.author_name || null, allowed: !!data.share_allowed,
    choice: data.share_choice ?? null, mine: !!data.mine, shared: !!data.shared } : null;
  state.shareToken = data.share_token;
  state.model = data.model || null;
  state.row = row || { id: '', raw: '', subject: data.subject, year: data.year_group, group: '', mins: data.minutes, time: '', start: '', end: '', room: '', teacher: '', cover: null };
  $('overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  // The stored verdict paints with the plan. Before this it took an edge
  // function call to learn anything about a plan's structure, so a plan nobody
  // opened was never checked at all, and the same plan was re-checked on every
  // open.
  if (data.check_result && state.checks[data.id] === undefined) {
    state.checks[data.id] = data.check_result;
  }
  showPlan();
  // Checked after the first paint: the plan is readable immediately and the
  // verdict arrives a moment later, rather than the coordinator waiting on it.
  checkPlan(data.id).then(() => { if (state.planId === data.id) showPlan(); }).catch(() => {});
  return true;
}

function showPlan() {
  const r = state.row, p = state.plan;
  if (!r || !p) return;
  $('seam-state').textContent = state.approved ? t('seamApproved') : t('seamWaiting');
  const fallbackNote = bodyIsFallback()
    ? '<div class="flag" style="background:var(--warn-bg);color:#7c4a02"><span>!</span><div>' + esc(t('onlyInOther')) + '</div></div>'
    : '';
  const simNote = state.model === 'canned'
    ? '<div class="flag sim"><span>⚠</span><div><b>' + esc(t('simTitle')) + '</b> ' + esc(t('simBody')) + '</div></div>'
    : '';
  const fbRow = state.view === 'coordinator' ? fbRowForOpenPlan() : null;
  const fbBox = fbRow
    ? '<div class="fx fbbox"><h4>' + esc(t('fbThisPlan')) + '</h4>' + fbBody(fbRow) + '</div>'
    : '';
  const head =
  '<div class="addin-body">' +
    '<div class="addin-head"><div style="flex:1;min-width:0">' +
      '<h2 id="addin-title" class="plan-title">' + esc(p.title) + '</h2>' +
      '<div class="plan-meta">' + esc([subjectLabel(r.subject), yearLabel(r.year), r.group,
        r.start ? r.start + '–' + r.end : ''].filter(Boolean).join(' · ')) + '</div></div>' +
      '<button class="x" data-close aria-label="' + esc(t('close')) + '">✕</button></div>' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<div class="viewtog">' +
        '<button class="' + (state.view === 'coordinator' ? 'on' : '') + '" data-view="coordinator">' + esc(t('viewCoord')) + '</button>' +
        '<button class="' + (state.view === 'vikarie' ? 'on' : '') + '" data-view="vikarie">' + esc(t('viewSub')) + '</button>' +
      '</div>' +
      // The sidebar toggle sits behind this overlay, so the plan carries its own.
      (state.bodies && Object.keys(state.bodies).length > 1
        ? '<div class="viewtog">' + (['sv', 'en'] as Lang[]).filter((c) => state.bodies?.[c]).map((c) =>
            '<button class="' + (c === LANG ? 'on' : '') + '" data-planlang="' + c + '">' +
            (c === 'sv' ? 'SV' : 'EN') + '</button>').join('') + '</div>'
        : '') +
      '<span class="hint">' +
      (state.view === 'coordinator' ? esc(t('coordHint')) : esc(t('subHint')) + ' ' + esc(p.readTime || '')) +
      '</span></div>';
  // The approve button also sits in the footer, which in a side panel is a
  // long scroll below a whole lesson plan — far enough down that a coordinator
  // opening a draft reasonably concludes there is no way to approve it. The
  // decision belongs where they arrive, not where the document ends.
  const check = state.planId ? state.checks[state.planId] : null;
  const checkNote = state.view === 'coordinator' ? checkBanner(check) : '';
  const approveNote = state.view === 'coordinator' && state.planId ? approveBar() : '';
  // An approval that no longer matches the plan is said out loud, in the place
  // a coordinator decides from. Silence here is how a stale badge gets trusted.
  const staleNote = state.apprStale
    ? '<div class="flag" style="background:var(--warn-bg)"><span>!</span><div>' +
      esc(t('apprStaleWarn')) + '</div></div>'
    : '';
  $('addin-content').innerHTML = head + checkNote + staleNote + approveNote + simNote + fallbackNote + fbBox +
    (state.view === 'coordinator' ? coordView(p, r) : vikarieView(p, r)) + '</div>';
}

function minDiff(a: string, b: string) {
  const [h1 = 0, m1 = 0] = a.split(':').map(Number), [h2 = 0, m2 = 0] = b.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}


function coordView(p: Plan, r: Row) {
  const phases = p.phases || [];
  const sum = phases.reduce((a, ph) => { const m = String(ph.t || '').split('–'); return a + (m.length === 2 ? minDiff(m[0]!, m[1]!) : 0); }, 0);
  const lt = subLinkToken();
  const link = lt ? planUrl(lt) : null;
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
      // From the check, not assumed: a plan with blockers is not "all written".
      (() => { const ck = state.planId ? state.checks[state.planId] : null;
        return '<li>' + esc(t('allWritten')) + ' ' + (!ck ? '<span class="chip chip-neutral">' + esc(t('allWrittenUnknown')) + '</span>'
          : (ck.blockers || 0) ? '<span class="chip chip-warn">' + esc(t('checkIt')) + '</span>'
          : '<span class="chip chip-ok">' + esc(t('ok')) + '</span>') + '</li>'; })() +
      '<li>' + esc(t('requires')) + ' ' + esc(p.equipment?.need || '—') + '</li>' +
    '</ul></div>' +
    (state.approved
      ? '<div class="flag" style="background:var(--ok-bg);color:#14532d"><span>✓</span><div><b>' + esc(t('approvedTitle')) + '</b> ' +
        apprSignedLine() + ' ' +
        (link ? esc(t('subLink')) + ' <button type="button" class="linkchip mono" data-copylink="' + esc(lt) + '" title="' + esc(t('copyLink')) + '">' + CHK + '<span class="cl-label">' + esc(link) + '</span></button>' : '') + '</div></div>'
      : '') +
    shareTick() +
    '<div class="foot">' +
      (state.approved
        ? '<span class="spacer"></span><button class="btn btn-ghost" data-view="vikarie">' + esc(t('seeSubView')) + '</button>' +
          (link ? '<button class="btn btn-ghost" data-copymail="' + esc(lt) + '">' + CHK + '<span class="cl-label">' + esc(t('copyMail')) + '</span></button>' : '') +
          (link ? '<button class="btn btn-primary" data-copylink="' + esc(lt) + '">' + CHK + '<span class="cl-label">' + esc(t('copyLink')) + '</span></button>' : '')
        : '<span class="hint">' + esc(t('nothingBefore')) + '</span><span class="spacer"></span>' +
          '<button class="btn btn-ghost" data-frompool>' + esc(t('fromPool')) + '</button>' +
          '<button class="btn btn-ghost" data-regen>' + esc(t('regen')) + '</button>' +
          (state.planId ? apprButtons(0) : '')) +
    '</div></div>';
}

/** The per-plan choice: may this plan leave the school? Only on our own plans,
 *  and only once the database reports origin. */
function shareTick() {
  const s = state.pshare;
  if (!s || !s.mine) return '';
  const hint = s.origin === 'teacher' ? t('shareHintTeacher')
    : fillT('shareHintAi', { s: t(state.shareAi === false ? 'setOff' : 'setOn') });
  const now = !s.allowed ? t('shareOff') : s.shared ? t('shareNow') : t('shareWaits');
  return '<label class="sharetick"><input type="checkbox" data-shareplan' + (s.allowed ? ' checked' : '') + '>' +
    '<span><b>' + esc(t('shareTitle')) + '</b> <span class="orig ' + (s.origin === 'teacher' ? 'tch' : 'ai') + '">' +
    esc(t(s.origin === 'teacher' ? 'origTeacher' : 'origAi')) + '</span><br>' +
    '<span class="hint">' + esc(now) + ' ' + esc(hint) + '</span></span></label>';
}

/* ── Live assist (coordinator preview) ──────────────────
   The coordinator sees exactly what the substitute gets, and can judge the
   quality of it, but nothing here is saved: the heat map that tells us which
   sections are weak must be substitute presses only, not curiosity. */
function assistRow(ref: string, label: string | undefined) {
  const a = (k: string, v: string, txt: string) =>
    '<button data-assist="' + k + '" data-ref="' + esc(ref) + '"' +
    (v ? ' data-variant="' + v + '"' : '') +
    ' data-alabel="' + esc(label) + '">' + esc(txt) + '</button>';
  return '<div class="assist noprint">' +
    a('explain', '', t('aExplain')) + a('exercise', '', t('aExercise')) +
    a('level', 'easier', t('aEasier')) + a('level', 'harder', t('aHarder')) + '</div>';
}

function assistSheetHtml(extra: Extra, source: string) {
  const srcTxt = source === 'model' ? t('srcModel') : source === 'cache' ? t('srcCache') : source === 'fallback' ? t('srcFallback') : t('srcLibrary');
  let h = '<h3>' + esc(extra.title) + '</h3><div class="src">' + esc(srcTxt) +
          (extra.minutes ? ' · ' + extra.minutes + ' min' : '') + ' · ' + esc(t('assistPreview')) + '</div>';
  h += '<ol>' + (extra.lines || []).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>';
  if (extra.board) {
    h += '<h4 style="font-size:13px;margin-bottom:5px">' + esc(t('boardNow')) + '</h4>' +
         '<div class="board">' + esc(extra.board) + '</div>';
  }
  if ((extra.tasks || []).length) {
    h += '<h4 style="font-size:13px;margin:14px 0 5px">' + esc(t('tasksNow')) + '</h4>' +
         '<ol style="font-size:13.5px">' + extra.tasks!.map((x) =>
           '<li>' + esc(x.q) + ' <span class="ans">' + esc(x.a) + '</span></li>').join('') + '</ol>';
  }
  return h;
}

async function previewAssist(opts: { kind: string; ref?: string; label?: string; text?: string; variant?: string; minutes?: number }) {
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
      // So the extras cap applies to the right plan rather than pooling every
      // plan's extras into one bucket.
      plan_id: state.planId || undefined,
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

function vikarieView(p: Plan, _r: Row) {
  // One renderer, shared with the substitute's own page. This used to be a
  // second, parallel implementation; the two drifted and this was the stale
  // one, which is the one everybody looked at — it is what the FVK iframe
  // shows. The only coupling left is the label lookup, because the two hosts
  // carry different i18n.
  const MAP: StrMap = {
    goal: 'goalShort', need: 'youNeed', expect: 'expected',
    tasks: 'tasksTitle', stuck: 'stuckL', ahead: 'aheadL', wrong: 'goesWrong',
  };
  const HEAT = fbHeatMap();
  const lbl = (k: string) => t(MAP[k] || k);

  let h = '<div class="plan"><div class="planview">' +
    window.LKPlan.render(p, {
      lbl,
      assistRow: (ref: string, name?: string) => assistRow(ref, name),
      flag: (ref: string) => fbFlag(HEAT, ref),
      // The coordinator is previewing, not teaching: no projector, and the
      // depth switch belongs to the person in front of the class.
      projector: false,
    }) + '</div>';

  h += window.LKPlan.after(p, lbl) +
    '<section class="reg reg-plain"><div class="reg-h"><span class="n">&#9742;</span>' +
    esc(t('whoToCall')) + '</div>' +
    '<p style="font-size:13px"><b>' + esc(t('coordinator')) + '</b> · ' + esc(state.me?.school || '') +
    '<br><span style="color:var(--ink-soft)">' + esc(t('phoneNote')) + '</span></p></section>';

  h += '<section class="reg reg-plain"><div class="reg-h"><span class="n">+</span>' +
       esc(t('assistTitle')) + '</div>' +
       '<p class="hint" style="margin:0 0 9px">' + esc(t('assistNote')) + '</p>' +
       '<div class="assist noprint"><span class="hint" style="align-self:center">' + esc(t('minLeft')) + '</span>' +
       [5, 10, 15, 20].map((m) => '<button data-fill="' + m + '">' + m + '</button>').join('') +
       '</div></section>';

  h += '<div class="foot"><span class="hint">' + esc(t('subSeesThis')) + '</span><span class="spacer"></span>' +
       '<button class="btn btn-ghost" data-view="coordinator">' + esc(t('back')) + '</button></div></div>';
  return h;
}

/* ── Events ────────────────────────────────────────── */
const copyTimers = new WeakMap<Element, ReturnType<typeof setTimeout>>();

document.addEventListener('click', async (e) => {
  const tg = e.target as HTMLElement;
  // Live assist, handled first: the delegation guard below does not list
  // these attributes and would drop them.
  const a = tg.closest<HTMLElement>('[data-assist]');
  if (a) {
    return previewAssist({
      kind: a.getAttribute('data-assist')!,
      ref: a.getAttribute('data-ref')!,
      label: a.getAttribute('data-alabel')!,
      variant: a.getAttribute('data-variant') || '',
      text: a.closest<HTMLElement>('.phase, .ps')?.innerText?.slice(0, 1200) || '',
    });
  }
  const fill = tg.closest<HTMLElement>('[data-fill]');
  if (fill) {
    return previewAssist({
      kind: 'filler', ref: 'lesson', label: t('aFill'),
      minutes: Number(fill.getAttribute('data-fill')!),
    });
  }
  if (tg.closest<HTMLElement>('[data-assistclose]') || tg.id === 'assist-sheet') {
    $('assist-sheet').hidden = true;
    return;
  }

  const blk = tg.closest<HTMLElement>('[data-blk]');
  if (blk) { const r = blk.getBoundingClientRect(); return openPop(blk.getAttribute('data-blk')!, r.right + 6, r.top); }
  if (await crClick(tg)) return;
  const fbf = tg.closest<HTMLElement>('[data-fbfix]');
  if (fbf) return draftFix(Number(fbf.getAttribute('data-fbfix')));
  const fbu = tg.closest<HTMLElement>('[data-fbuse]');
  if (fbu) return useFix(Number(fbu.getAttribute('data-fbuse')));
  const fbd = tg.closest<HTMLElement>('[data-fbdrop]');
  if (fbd) { const a = state.attn[Number(fbd.getAttribute('data-fbdrop'))]; if (a) delete state.fixes[a.plan + '|' + (a.ref || '')]; return renderFeedback(); }
  const tpc = tg.closest<HTMLElement>('[data-tpcell]');
  if (tpc) {
    const [cs, cy] = tpc.getAttribute('data-tpcell')!.split('|');
    $<HTMLSelectElement>('tp-subject').value = cs!; $<HTMLSelectElement>('tp-year').value = cy!;
    renderTermCoverage();
    await renderTermStored();
    $('tp-stored').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const tab = tg.closest<HTMLElement>('[data-tab]');
  if (tab) return showPlansTab(tab.getAttribute('data-tab')!);
  const shp = tg.closest<HTMLInputElement>('[data-shareplan]');
  if (shp && state.planId) {
    const want = shp.checked;
    const { data, error } = await sb.rpc('lk_set_plan_share', { p_id: state.planId, p_allow: want });
    if (error || !data || data.error) { shp.checked = !want; toast(error?.message || t('errNeedsDb')); return; }
    if (state.pshare) { state.pshare.allowed = !!data.share_allowed; state.pshare.choice = want; state.pshare.shared = !!data.shared; }
    toast(t(want ? 'shareOnToast' : 'shareOffToast'));
    showPlan(); loadBank();
    return;
  }
  const sai = tg.closest<HTMLElement>('[data-shareai]');
  if (sai) {
    const on = sai.getAttribute('data-shareai') === '1';
    const { error } = await sb.rpc('lk_set_share_ai', { p_on: on });
    if (error) { toast(error.message); return; }
    state.shareAi = on; renderSettings(); toast(t('shareSaved')); loadBank();
    return;
  }
  if (tg.closest<HTMLElement>('[data-fvklink]')) { toast(t('authLater')); return; }
  const signin = tg.closest<HTMLElement>('[data-signin]');
  if (signin) return mockSignIn(signin.getAttribute('data-signin') as AuthMethod);
  const psub = tg.closest<HTMLElement>('[data-poolsub]');
  if (psub) return openShelf(psub.getAttribute('data-poolsub')!, '');
  const pyr = tg.closest<HTMLElement>('[data-poolyr]');
  if (pyr) return openShelf(null, pyr.getAttribute('data-poolyr')!);
  const pcell = tg.closest<HTMLElement>('[data-poolcell]');
  if (pcell) { const [cs, cy] = pcell.getAttribute('data-poolcell')!.split('|'); return openShelf(cs!, cy!); }
  const pview = tg.closest<HTMLElement>('[data-poolview]');
  if (pview) { state.pool.view = pview.getAttribute('data-poolview') === 'cover' ? 'cover' : 'shelf'; savePoolPick(); return renderBank(); }
  if (tg.closest<HTMLElement>('[data-poolgo]') && state.row) {
    // From an absence with nothing approved for it: straight to its shelf.
    state.pool = { view: 'shelf', sub: canonSubject(state.row.subject), yr: canonYear(state.row.year) };
    savePoolPick();
    closeAddin();
    state.tab = 'bank';
    return showScreen('plans');
  }
  const loud = tg.closest<HTMLElement>('[data-loud]');
  if (loud) return setLoud(loud.getAttribute('data-loud')!);
  const po = tg.closest<HTMLElement>('[data-planopen]');
  if (po) return openPlanPanel(po.getAttribute('data-planopen')!);
  const pl = tg.closest<HTMLElement>('[data-planlink]');
  if (pl) return openLinkBox(pl.getAttribute('data-planlink')!);
  const pn = tg.closest<HTMLElement>('[data-plannot]');
  if (pn) {
    const ref = pn.getAttribute('data-plannot')!;
    closePop();
    await sb.rpc('lk_set_cover_plan', { p_absence_ref: ref, p_kind: 'not_needed' });
    await loadCoverPlans(); renderRows(); toast(t('cvPlNotSaved'));
    return;
  }
  const pxt = tg.closest<HTMLElement>('[data-planextend]');
  if (pxt) {
    closePop();
    const { data: until } = await sb.rpc('lk_extend_cover_plan', { p_absence_ref: pxt.getAttribute('data-planextend')!, p_days: 14 });
    await loadCoverPlans(); renderRows();
    if (until) toast(t('cvPlExtended') + ' ' + new Date(until).toLocaleDateString(LANG === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short' }));
    return;
  }
  const pc = tg.closest<HTMLElement>('[data-planclear]');
  if (pc) {
    const ref = pc.getAttribute('data-planclear')!;
    closePop();
    await sb.rpc('lk_clear_cover_plan', { p_absence_ref: ref });
    await loadCoverPlans(); renderRows();
    return;
  }
  if (tg.closest<HTMLElement>('[data-lbcancel]')) { $('linkbox').hidden = true; return; }
  const lbs = tg.closest<HTMLElement>('[data-lbsave]');
  if (lbs) return saveLink(lbs.getAttribute('data-lbsave')!);
  if (tg.closest<HTMLElement>('[data-planfirst]')) {
    const first = ROWS.find((r) => r.plannable && r.cover && !planFor(r.id));
    if (first) return openPlanPanel(first.id);
  }
  if (POP && !tg.closest<HTMLElement>('#cv-pop')) closePop();

  const el = tg.closest<HTMLElement>('[data-close],[data-generate],[data-approve],[data-regen],[data-frompool],[data-view],[data-planlang],[data-usebank],[data-res],[data-viewplan],[data-copylink],[data-copymail],[data-review],[data-cap],[data-nav],[data-lang],#refreshbank');
  if (!el) return;
  const t2 = el as HTMLButtonElement;

  if (t2.hasAttribute('data-lang')) return setLang(t2.getAttribute('data-lang') === 'en' ? 'en' : 'sv');
  if (t2.hasAttribute('data-nav')) {
    const id = t2.getAttribute('data-nav')!;
    const item = NAV.find((n) => n.id === id);
    if (!item || !item.real) { toast(t('notHere')); return; }
    return showScreen(id);
  }
  if (t2.id === 'refreshbank') return loadBank();
  if (t2.hasAttribute('data-cap')) {
    const v = Number(t2.getAttribute('data-cap')!);
    const { data, error } = await sb.rpc('lk_set_assist_cap', { p_cap: v });
    if (error || !data) { toast(error?.message || 'error'); return; }
    state.cap = v; renderSettings(); toast(t('capSaved'));
    return;
  }
  if (t2.hasAttribute('data-review')) {
    const [id, keep] = t2.getAttribute('data-review')!.split(':');
    t2.disabled = true;
    const { error } = await sb.rpc('lk_review_extra', { p_extra_id: Number(id), p_kept: keep === '1' });
    if (error) { t2.disabled = false; toast(error.message); return; }
    toast(t(keep === '1' ? 'keptToast' : 'hiddenToast'));
    return loadFeedback();
  }
  if (t2.hasAttribute('data-res')) return t2.classList.toggle('on');
  if (t2.hasAttribute('data-close')) return closeAddin();
  if (t2.hasAttribute('data-generate')) return generate();
  if (t2.hasAttribute('data-regen')) return showRequest();
  if (t2.hasAttribute('data-frompool')) { showRequest(); const br = document.querySelector('.bankrow'); if (br) br.scrollIntoView({ block: 'center' }); return; }
  if (t2.hasAttribute('data-view')) { state.view = t2.getAttribute('data-view')!; return showPlan(); }
  if (t2.hasAttribute('data-planlang')) return setLang(t2.getAttribute('data-planlang') === 'en' ? 'en' : 'sv');
  if (t2.hasAttribute('data-viewplan')) return usePlan(t2.getAttribute('data-viewplan')!);
  if (t2.hasAttribute('data-usebank')) {
    const pid = t2.getAttribute('data-usebank')!;
    // Picked for a real cover, so it counts as given to that class.
    const forRow = state.row;
    return usePlan(pid, forRow).then((ok) => ok ? logUse(pid).then(() => { if (state.planId === pid) showPlan(); }) : undefined);
  }

  if (t2.hasAttribute('data-copylink') || t2.hasAttribute('data-copymail')) {
    const tok = t2.getAttribute('data-copylink') || t2.getAttribute('data-copymail')!;
    const url = planUrl(tok);
    let text = url;
    if (t2.hasAttribute('data-copymail')) {
      const r: Partial<Row> = state.row || {};
      const what = [r.subject, r.year, r.group && '(' + r.group + ')'].filter(Boolean).join(' ') + (r.start ? ', ' + r.start + '–' + r.end : '');
      text = t('mailHi') + '\n\n' + t('mailIntro') + ' ' + what + ':\n' + url + '\n\n' + t('mailNote') + '\n\n' + t('mailBye');
    }
    const label = t2.querySelector<HTMLElement>('.cl-label') || t2;
    const orig = label.dataset.orig || label.textContent || '';
    label.dataset.orig = orig;
    let ok = true;
    try { await navigator.clipboard.writeText(text); }
    catch {
      try { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); }
      catch { ok = false; }
    }
    if (!ok) { toast(text, 12000); return; }
    clearTimeout(copyTimers.get(t2));
    t2.classList.remove('copied'); void t2.offsetWidth; t2.classList.add('copied');
    label.textContent = t('copiedShort');
    copyTimers.set(t2, setTimeout(() => { t2.classList.remove('copied'); label.textContent = orig; }, 1800));
    return;
  }

  if (t2.hasAttribute('data-approve')) {
    const kind = t2.getAttribute('data-approve') || 'coordinator';
    const name = apprNameValue().trim();
    if (name.length < 2) {
      toast(t('errName'));
      const f = $('apr-name');
      if (f) { f.scrollIntoView({ block: 'center' }); f.focus(); }
      return;
    }
    const first = !state.approved;
    const { data: ap, error } = await sb.rpc('lk_approve_as',
      { p_id: state.planId, p_kind: kind, p_subject: null, p_name: name });
    if (error) { toast(t('errApprove') + ' ' + error.message); return; }
    const { data } = await sb.rpc('lk_plan', { p_id: state.planId });
    if (data) applyApproval(data);
    if (ap && ap.ok === false) {
      // Someone got there first, or the gate is closed: show what is true now.
      toast(t('errApprove') + ' ' + t(APPR_ERR[ap.error] || 'errApprove'));
      showPlan();
      return;
    }
    try { localStorage.setItem(APPROVER_KEY, name); } catch { /* the name just is not remembered */ }
    state.shareToken = data?.share_token || null;
    // Only the first approval counts as a "would reuse" rating and as the plan
    // being given to a class. Climbing the ladder is the same plan, same lesson.
    if (first) {
      await sb.rpc('lk_rate_v2', { p_id: state.planId, p_reuse: true, p_reasons: [] });
      await logUse(state.planId);
      if (state.screen === 'cover') await loadCoverPlans().then(renderRows).catch(() => {});
      toParent('lk:plan', {
        planId: state.planId,
        ref: state.row?.id || null,
        shareToken: state.shareToken,
        url: subLinkToken() ? planUrl(subLinkToken()) : null,
        title: state.plan?.title || null,
      });
    }
    showPlan();
    loadBank();
    toast(t('okApproved'));
    return;
  }
});

// The approver's name survives the plan view re-rendering (view toggle, language).
document.addEventListener('input', (e) => {
  const tg = e.target as HTMLInputElement | null;
  if (tg && tg.id === 'apr-name') state.apprName = tg.value;
});

// Escape closes the assist sheet first; only if nothing is over the plan
// does it close the add-in. Listeners on the same target fire in
// registration order, so this has to be one handler, not two.
// The cover grid's lesson blocks are buttons to a keyboard too.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const blk = (e.target as HTMLElement).closest?.<HTMLElement>('[data-blk]');
  if (!blk) return;
  e.preventDefault();
  const r = blk.getBoundingClientRect();
  openPop(blk.getAttribute('data-blk')!, r.right + 6, r.top);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const sheet = $('assist-sheet');
  if (sheet && !sheet.hidden) { sheet.hidden = true; return; }
  if (!$('overlay').hidden) closeAddin();
});
$('overlay').addEventListener('mousedown', (e) => { if ((e.target as HTMLElement).id === 'overlay') closeAddin(); });
['f-scope', 'f-approval', 'f-origin']
  .forEach((id) => $(id).addEventListener('change', loadBank));

wireTerm();
wireCreate();
function showScreen(which: string) {
  state.screen = which;
  const onPlans = which === 'plans';
  $('screen-cover').hidden = which !== 'cover';
  $('screen-plans').hidden = !onPlans;
  if (onPlans) showPlansTab(state.tab);
  renderNav();
  if (which === 'cover') loadCoverPlans().then(renderRows).catch(() => {});
  setTitles();
  window.scrollTo(0, 0);
}

boot();

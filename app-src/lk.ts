/* Lektionskollen — the add-in, running against real Supabase.
   Schema: `lektionskollen` in the skolkollen-portal project, reached only
   through the public.lk_* security-definer functions. */

import type { Plan } from './types';

const SUPABASE_URL = 'https://pbamabzbfbkxajntsrmc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiYW1hYnpiZmJreGFqbnRzcm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzU3MTEsImV4cCI6MjA5NTkxMTcxMX0.9G3-2cFOHwVqVOsIBcHomrEEclISFUaIQlg10nIlWHM';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/** Looks an element up by id. The page's own markup guarantees the ids this file asks for, so a miss is a bug worth throwing on, as the null dereference it replaces did. */
function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error('missing #' + id);
  return el as T;
}
/** Same lookup, for the places that genuinely test whether the element is there. */
const maybe$ = <T extends HTMLElement = HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"]/g, (c) => ESC[c] ?? c);

/* ── Shapes ─────────────────────────────────────────
   The rows below come back from the lk_* functions as JSON, so these describe
   what the database sends, not what this file wishes it did. */
type Lang = 'sv' | 'en';
type StrMap = Record<string, string>;
interface Me { school_id: string; school: string; role: string }
interface Row {
  id: string; time: string; start: string; end: string; mins: number; teacher: string;
  group: string; raw: string; subject: string; year: string; room: string; cover: string | null;
  plannable?: boolean; whyKey?: string; practical?: boolean;
}
interface CoverPlan {
  kind: 'generated' | 'linked' | 'note' | 'authored' | 'not_needed';
  approved?: boolean; plan_id?: string; share_token?: string; label?: string; url?: string;
  note?: string; expires_at?: string; expired?: boolean;
}
interface BankRow {
  id: string; subject: string; year_group: string; title: string; title_alt?: string | null; language_alt?: string | null;
  minutes: number; approved?: boolean; shared?: boolean; mine?: boolean; school?: string; share_token: string;
  rating_count?: number; rating?: number | null;
  approval_rank?: number | null; approved_name?: string | null; approved_subject?: string | null; approval_stale?: boolean;
  st?: { score?: number | null; n?: number } | null; n_v?: number; yes_v?: number;
  // Present once the 20261028a migration is in; absent on an older database.
  origin?: 'ai' | 'teacher'; author_name?: string | null; share_allowed?: boolean | null;
}
/** Where an open plan came from and whether it may leave its school. */
interface PlanShare { origin: 'ai' | 'teacher'; author: string | null; allowed: boolean; choice: boolean | null; mine: boolean; shared: boolean }
interface UseRow { plan_id: string; group_name: string; used_on: string; run_token?: string }
interface Extra { title?: string; minutes?: number; lines?: string[]; board?: string; tasks?: { q?: string; a?: string }[] }
interface Standing { n?: number; score?: number | null; burnt?: boolean; worst_label?: string; worst_explains?: number; assists?: number }
interface CheckProblem { level?: string; where?: string; detail?: string }
interface Heat { section_ref?: string; section_label?: string; kind: string; n: number }
interface SecFb {
  section_ref: string; section_label?: string; good: number; ok: number; bad: number; skipped: number; notes?: string[];
}
interface RunFb {
  group: string; time?: string; date: string; substitute?: string; answered?: boolean; stars?: number | string;
  good: number; ok: number; bad: number; teacher?: string;
}
interface FbComment { coverage?: 'all' | 'part' | 'none'; left_off?: string; comment?: string; reasons?: string[] }
interface FbPlan {
  id: string; title?: string; subject: string; year_group: string; ratings?: number; yes?: number;
  heat?: Heat[]; sections?: SecFb[]; runs: RunFb[]; feedback?: { notes: { section_label?: string; note: string }[]; comments: FbComment[] };
}
interface QueueItem {
  id: number | string; subject: string; year_group: string; kind: string; variant?: string; section_label?: string;
  model?: string; title?: string; created_at: string; reviewed?: boolean; created_by_kind?: string;
  language?: string; language_alt?: string; body?: Extra | null; body_alt?: Extra | null;
  plan_id?: string; section_ref?: string; kept?: boolean; sub_verdict?: 'up' | 'down' | null; auto_reason?: string | null; reviewed_at?: string | null;
}
/** Something on a plan that a person should look at, and why. */
interface Attn {
  kind: 'bad' | 'help' | 'low' | 'extra'; plan: string; title: string; subject: string; year: string;
  ref?: string; label?: string; bad?: number; total?: number; help?: number; helpKinds?: string; notes?: string[]; extra?: QueueItem;
}
interface TermRow { week: number | string; topic?: string; note?: string }
interface TermCover { subject: string; year_group: string; weeks?: number; first_week?: number; last_week?: number; updated_at?: string }
interface Verdict {
  ok?: boolean; warnings?: number; blockers?: number; subject_checked?: boolean; problems?: CheckProblem[];
}

/* ── Language ───────────────────────────────────────
   Mirrors FVK's own sv/en toggle. The generated plan keeps the language
   it was written in; only the chrome switches. */
let LANG: Lang = (() => {
  // In a panel the host app owns the language; standalone we remember our own.
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'sv' || q === 'en') return q;
  try { return localStorage.getItem('lk.lang') === 'en' ? 'en' : 'sv'; } catch { return 'sv'; }
})();
const TT = window.LK_T as Record<Lang, StrMap>;
const t = (k: string): string => (TT[LANG] && TT[LANG][k]) || TT.sv[k] || k;

function setLang(l: Lang) {
  LANG = l;
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

function setTitles() {
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

function renderNav() {
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

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function toast(msg: string, ms = 4000) {
  const box = $('toast');
  box.textContent = msg;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, ms);
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

// The plan fields below are only as typed as the plan itself; see types.ts.
const state = {
  me: null as Me | null, row: null as Row | null, plan: null as Plan | null,
  bodies: null as Partial<Record<Lang, Plan>> | null, planId: null as string | null,
  view: 'coordinator', bank: [] as BankRow[], screen: 'cover', fb: [] as FbPlan[], pending: 0,
  queue: [] as QueueItem[], extras: [] as QueueItem[], attn: [] as Attn[], fixes: {} as Record<string, { busy?: boolean; before?: Plan; after?: Plan; err?: string }>, model: null as string | null, cap: 20, uses: [] as UseRow[],
  share: {} as Record<string, Standing>, termCoverage: [] as TermCover[], tab: 'bank', checks: {} as Record<string, Verdict | null>,
  // Which shelf of the pool is open, remembered between visits.
  pool: loadPoolPick(),
  // The create-a-plan wizard, while it is open.
  cr: null as CrState | null,
  pshare: null as PlanShare | null, shareAi: undefined as boolean | undefined, hasOrigin: false,
  // Set once a plan is opened: who approved it and how.
  shareToken: undefined as string | null | undefined,
  approved: undefined as boolean | undefined,
  apprKind: undefined as string | null | undefined,
  apprBy: undefined as string | null | undefined, apprName: undefined as string | undefined,
  apprRank: undefined as number | undefined, apprSubject: undefined as string | null | undefined,
  apprStale: undefined as boolean | undefined,
};

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
function fvkLinkCard() {
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
    document.body.innerHTML = '<p style="padding:40px;font:14px Geist,sans-serif">Demoskolan saknas i databasen.</p>';
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
  loadBank();
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
    [['quiet', 'cvQuiet'], ['marked', 'cvMarked'], ['nudge', 'cvNudge']].map(([v, k]) =>
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
    // The structural verdict is now computed and stored when the plan is
    // saved, so it is already on the row and costs nothing to show. The edge
    // call below is still worth making: lk-verify adds a subject pass, which
    // is the one judgement SQL cannot make.
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
  const map: Record<string, string[]> = {
    ok: ['ok', 'lkOk'],
    missing: ['bad', 'lkMissing'],
    private: ['warn', 'lkPrivate'],
    slow: ['warn', 'lkSlow'],
    unreachable: ['warn', 'lkUnreachable'],
    bad: ['bad', r && r.reason === 'not_http' ? 'lkNotHttp' : r && r.reason === 'private_address' ? 'lkPrivateAddr' : 'lkNotUrl'],
  };
  const m = map[(r && r.status) || 'unreachable'] || map.unreachable;
  box.className = 'linkstate ' + m[0];
  box.textContent = t(m[1]);
}

async function saveLink(ref: string) {
  const url = $<HTMLInputElement>('lb-url').value.trim();
  const note = $<HTMLTextAreaElement>('lb-note').value.trim();
  const label = $<HTMLInputElement>('lb-label').value.trim();
  if (!url && !note) { toast(t('cvPlNeedOne')); return; }
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
    state.row = r;
    usePlan(p.plan_id);
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
  const all = ROWS.map((r) => [hhmmToMins(r.start), hhmmToMins(r.end)]);
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



/* ── Subject and year, in the reader's language ──────────
   The timetable is Swedish and always will be: "Ma", "Tb7a" and "Svenska" are
   what Frånvarokollen imports and what the plan row stores. Only the display
   switches, so the stored value stays the one the school recognises and
   nothing needs migrating when a new subject appears — an unknown subject
   simply shows as written. */
const SUBJECTS_EN: StrMap = {
  'Matematik': 'Mathematics', 'Svenska': 'Swedish', 'Engelska': 'English',
  'Biologi': 'Biology', 'Fysik': 'Physics', 'Kemi': 'Chemistry',
  'Historia': 'History', 'Geografi': 'Geography', 'Samhällskunskap': 'Civics',
  'Religionskunskap': 'Religious education', 'Idrott': 'PE', 'Idrott och hälsa': 'PE',
  'Slöjd': 'Craft and design', 'Teknik': 'Design and technology',
  'Musik': 'Music', 'Bild': 'Art', 'Hem- och konsumentkunskap': 'Home economics',
  'Moderna språk': 'Modern languages', 'Spanska': 'Spanish', 'Tyska': 'German',
  'Franska': 'French', 'NO': 'Science', 'SO': 'Humanities',
  'Svenska som andraspråk': 'Swedish as a second language', 'Modersmål': 'Mother tongue tuition',
  'Teckenspråk för hörande': 'Sign language', 'Elevens val': "Pupil's choice",
};

/* ── Every year and subject a school can teach, F to Åk 9 ──
   The pickers used to be built from whatever plans already existed, so a
   school could not plan a subject or a year nobody had yet made a cover
   lesson for. These are the grundskola's own (Skolverket, LGR22), spelled the
   way the database stores them. The database folds the common alternative
   spellings into these (lektionskollen.canon_subject). Gymnasiet is not here
   on purpose: it needs its own programme and course structure. */
const CATALOG_YEARS = ['F', 'Åk 1', 'Åk 2', 'Åk 3', 'Åk 4', 'Åk 5', 'Åk 6', 'Åk 7', 'Åk 8', 'Åk 9'];
const CATALOG_SUBJECTS = [
  'Matematik', 'Svenska', 'Svenska som andraspråk', 'Engelska', 'Moderna språk',
  'Biologi', 'Fysik', 'Kemi', 'Teknik', 'Geografi', 'Historia', 'Religionskunskap',
  'Samhällskunskap', 'Idrott och hälsa', 'Musik', 'Bild', 'Slöjd',
  'Hem- och konsumentkunskap', 'Modersmål', 'Teckenspråk för hörande',
];
const SUBJECT_ALIAS: StrMap = {
  'idrott': 'Idrott och hälsa', 'hemkunskap': 'Hem- och konsumentkunskap',
  'hkk': 'Hem- och konsumentkunskap', 'sva': 'Svenska som andraspråk',
  'religion': 'Religionskunskap',
};
/** The same folding the database does, so a list never shows both spellings. */
function canonSubject(s: unknown) {
  const k = String(s || '').trim();
  return SUBJECT_ALIAS[k.toLowerCase()] || k;
}
function canonYear(y: unknown) {
  const k = String(y || '').trim();
  if (/^(f|fsk|f-klass|förskoleklass|forskoleklass)$/i.test(k)) return 'F';
  const m = /^(?:åk|ak|årskurs)\s*(\d+)$/i.exec(k);
  return m ? 'Åk ' + m[1] : k;
}

function subjectLabel(s: string | undefined) {
  if (LANG !== 'en' || !s) return s || '';
  return SUBJECTS_EN[s] || s;
}

/** "Åk 7" is the Swedish school year. English readers get "Year 7". */
function yearLabel(y: string | undefined) {
  if (y === 'F') return LANG === 'en' ? 'Preschool class' : 'Förskoleklass';
  if (LANG !== 'en' || !y) return y || '';
  const m = /^\s*Åk\s*(\d+)/.exec(y);
  return m ? 'Year ' + m[1] : y;
}

/* ── Bank ──────────────────────────────────────────── */
async function loadBank() {
  const scope = $<HTMLSelectElement>('f-scope').value || 'all';
  const approval = $<HTMLSelectElement>('f-approval').value || 'any';
  const origin = $<HTMLSelectElement>('f-origin').value || 'any';
  // lk_pool rather than lk_bank_ranked: same ranking, plus what kind of
  // approval each plan carries and whether that approval still matches the
  // body it was given to.
  const args: Record<string, string | null> = { p_subject: null, p_year: null, p_scope: scope, p_approval: approval };
  if (origin !== 'any') args.p_origin = origin;
  const { data, error } = await sb.rpc('lk_pool', args);
  if (error) { $('bankgrid').innerHTML = '<p class="note">' + esc(t('errBank')) + ' ' + esc(error.message) + '</p>'; return; }
  state.bank = data || [];
  fillFilterOptions();
  renderBank();
}

function fillFilterOptions() {
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
function rowTitle(b: BankRow) {
  if (b.language_alt === LANG && b.title_alt) return b.title_alt;
  return b.title;
}

function stars(r: unknown) {
  const n = Math.round(Number(r) || 0);
  return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
}

/** The year group as a number, so Ak 10 sorts after Ak 9 rather than after
 *  Ak 1. Anything with no number in it goes last, alphabetically. */
function yearNum(y: unknown) {
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
const APPR_MAX = 3;
function apprLevelName(n: number) { return t('apLvl' + n); }

/** Stars and a number: how far up the ladder a plan has been signed off. It is
 *  not the substitutes' score, which stays a number out of 100 beside it. */
function apprStars(rank: unknown, who?: string, bare?: boolean) {
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
type PoolPick = { view: 'shelf' | 'cover'; sub: string; yr: string };

function loadPoolPick(): PoolPick {
  try {
    const v = JSON.parse(localStorage.getItem('lk.pool') || '{}') as Partial<PoolPick>;
    return { view: v.view === 'cover' ? 'cover' : 'shelf', sub: String(v.sub || ''), yr: String(v.yr || '') };
  } catch { return { view: 'shelf', sub: '', yr: '' }; }
}
function savePoolPick() {
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

function poolViewToggle() {
  const v = state.pool.view;
  const box = maybe$('poolview');
  if (!box) return;
  box.innerHTML =
    '<button class="' + (v === 'shelf' ? 'on' : '') + '" data-poolview="shelf">' + esc(t('poolShelf')) + '</button>' +
    '<button class="' + (v === 'cover' ? 'on' : '') + '" data-poolview="cover">' + esc(t('poolCover')) + '</button>';
}

function renderBank() {
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
function openShelf(sub: string | null, yr: string | null) {
  if (sub != null) state.pool.sub = sub;
  if (yr != null) state.pool.yr = yr;
  state.pool.view = 'shelf';
  savePoolPick();
  renderBank();
}

function fillT(k: string, o: Record<string, string | number | null | undefined>): string { return t(k).replace(/\{(\w+)\}/g, (_m, x: string) => String(o[x])); }

/** Why a plan is in the pool or out of it, read live so it cannot drift from
 *  the rule. There is no entry test any more: an approved plan is available,
 *  and the only way out is evidence against it. */
async function shareWhy(id: string, box: HTMLElement) {
  if (!state.share[id]) {
    const { data, error } = await sb.rpc('lk_plan_standing', { p_id: id });
    if (error || !data) { box.innerHTML = '<p class="hint">' + esc((error && error.message) || '—') + '</p>'; return; }
    state.share[id] = data;
  }
  const d = state.share[id]!;
  const row = (pass: boolean, text: string, detail?: string) =>
    '<li class="' + (pass ? 'pass' : 'fail') + '"><span>' + (pass ? '✓' : '✕') + '</span><div>' + esc(text) +
    (detail ? '<br><span class="muted">' + esc(detail) + '</span>' : '') + '</div></li>';
  const b: Partial<BankRow> = state.bank.find((x) => x.id === id) || {};
  const n = d.n || 0;
  const sc = d.score != null ? Math.round(d.score * 100) : null;
  const scored = n >= 3 && sc != null && sc < 40;
  box.innerHTML = '<ul class="whylist">' +
    row(!!b.approved, t('whyApproved'), b.approved ? '' : t('whyApprovedNo')) +
    row(!scored, t('whyScoreOk'),
        n === 0 ? t('whyNoRatings')
        : scored ? fillT('whyScoreBad', { s: sc })
        : fillT('whyScoreIs', { s: sc, n: n })) +
    row(!d.burnt, t('whyNotBurnt'),
        d.burnt ? fillT('whyBurntNo', { s: d.worst_label || t('wholeLesson'), c: d.worst_explains })
        : d.assists ? fillT('whyAssists', { n: d.assists }) : '') +
    '</ul><p class="hint">' + esc(t('whyFoot')) + '</p>';
}

/* ── Which class already had this lesson ─────────────────
   A good plan should be reused — with a different class. Staff and class group
   only; no pupil is named, here or anywhere in Lektionskollen. */
async function loadUses() {
  const { data } = await sb.rpc('lk_uses');
  state.uses = data || [];
}

/** "Last given to 7A on 12 Sept" — the line that stops a class getting a repeat. */
function usedLine(planId: string) {
  const u = usesOf(planId);
  if (!u.length) return '';
  const last = u[0];
  return '<p class="shline used">' + esc(fillT('usedLast', { g: last.group_name, d: fmtDate(last.used_on) })) +
    (u.length > 1 ? ' ' + esc(fillT('usedTimes', { n: u.length })) : '') + '</p>';
}

function usesOf(planId: string, group?: string) {
  return state.uses.filter((u) => u.plan_id === planId && (!group || u.group_name === group));
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(LANG === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short' });
}

/** Record that a plan went to a class. Silent: a failure here must never block
 *  a lesson, and never the approval it rides along with. A Supabase query
 *  builder is thenable but not a Promise, so it has no .catch to hang this on. */
async function logUse(planId: string | null) {
  const r = state.row;
  if (!planId || !r || !r.group) return;
  try {
    await sb.rpc('lk_log_run', {
      p_plan_id: planId, p_group: r.group, p_absence_ref: r.id || null, p_substitute: r.cover || null,
      p_time: r.start ? r.start + (r.end ? '–' + r.end : '') : null,
    });
    await loadUses();
  } catch { /* the lesson matters more than the bookkeeping */ }
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
    lang: q.get('lang') === 'en' ? 'en' : null,
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
  loadBank().then(() => { if (!state.planId) showRequest(); }).catch(() => showRequest());
  showRequest();
  toParent('lk:ready', { ref: EMBED.row.id });
}

function openAddin(id: string) {
  state.row = ROWS.find((x) => x.id === id) || null;
  state.plan = null; state.planId = null; state.view = 'coordinator';
  // The pool then opens on this absence's shelf, which is the one the
  // coordinator is most likely to go looking in next.
  if (state.row) { state.pool.sub = canonSubject(state.row.subject); state.pool.yr = canonYear(state.row.year); savePoolPick(); }
  $('overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  showRequest();
}
function closeAddin() {
  stopWait();
  state.cr = null;
  if (EMBED) { toParent('lk:close', {}); return; }
  $('overlay').hidden = true;
  document.body.style.overflow = '';
  document.body.classList.remove('panelmode');
  if (state.screen === 'cover') loadCoverPlans().then(renderRows).catch(() => {});
}

function showRequest() {
  const r = state.row;
  if (!r) return;
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
          (had.length ? '<div class="hadwarn">⚠ ' + esc(fillT('hadIt', { g: r.group, d: fmtDate(had[0].used_on) })) + '</div>' : '') + '</div>' +
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

/* ── While the AI writes ──────────────────────────────────
   A real plan takes a minute or two. The old bar reached 90 % in four
   seconds and then sat there, which reads as a hang. So the wait now says
   how long it can take, shows the time passing, moves the bar on the clock
   (it creeps toward the end and never fills until the plan is back), and
   gives the eye something to do: Kollen the owl, reading and writing. */
let waitTimer: number | undefined;
const WAIT_EXPECT = 120;   // seconds, what we tell people
const OWL_SVG =
  '<svg class="owl" viewBox="0 0 140 130" aria-hidden="true">' +
    '<ellipse cx="70" cy="122" rx="44" ry="5" fill="rgba(13,35,64,.12)"/>' +
    '<g class="owl-bob">' +
      '<ellipse cx="70" cy="72" rx="36" ry="40" fill="#1b4776"/>' +
      '<path d="M40 62 Q30 80 38 100 Q46 90 46 72Z" fill="#153a62"/>' +
      '<path d="M100 62 Q110 80 102 100 Q94 90 94 72Z" fill="#153a62"/>' +
      '<ellipse cx="70" cy="84" rx="23" ry="26" fill="#e8f0fb"/>' +
      '<path d="M58 80 q4 4 8 0 M70 88 q4 4 8 0 M58 96 q4 4 8 0 M74 78 q3 3 6 0" stroke="#b8c9dc" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<circle cx="56" cy="56" r="14" fill="#fff"/><circle cx="84" cy="56" r="14" fill="#fff"/>' +
      '<g class="owl-eyes"><circle cx="56" cy="59" r="6" fill="#0d2340"/><circle cx="84" cy="59" r="6" fill="#0d2340"/>' +
        '<circle cx="58" cy="57" r="2" fill="#fff"/><circle cx="86" cy="57" r="2" fill="#fff"/></g>' +
      '<g class="owl-lids"><ellipse cx="56" cy="56" rx="15" ry="15" fill="#1b4776"/><ellipse cx="84" cy="56" rx="15" ry="15" fill="#1b4776"/></g>' +
      '<path d="M65 66 L75 66 L70 75Z" fill="#f5a524"/>' +
      '<path d="M40 34 L70 22 L100 34 L70 46Z" fill="#0d2340"/>' +
      '<path d="M52 40 L52 48 Q70 56 88 48 L88 40 L70 46Z" fill="#0d2340"/>' +
      '<path class="owl-tassel" d="M100 34 L100 50" stroke="#f5a524" stroke-width="2.5" stroke-linecap="round"/>' +
    '</g>' +
    '<path d="M30 104 Q50 96 70 104 Q90 96 110 104 L110 120 Q90 112 70 120 Q50 112 30 120Z" fill="#fff" stroke="#1b4776" stroke-width="2"/>' +
    '<line x1="70" y1="104" x2="70" y2="120" stroke="#1b4776" stroke-width="1.5"/>' +
    '<g class="owl-ink" stroke="#1b4776" stroke-width="1.6" stroke-linecap="round">' +
      '<line class="l1" x1="38" y1="106" x2="62" y2="104"/><line class="l2" x1="38" y1="111" x2="60" y2="109"/>' +
      '<line class="l3" x1="78" y1="104" x2="102" y2="106"/><line class="l4" x1="78" y1="109" x2="98" y2="111"/></g>' +
    '<g class="owl-pencil"><rect x="0" y="-2" width="22" height="5" rx="1" fill="#f5a524" transform="rotate(-35)"/>' +
      '<path d="M0 -2 L-5 0.5 L0 3Z" fill="#0d2340" transform="rotate(-35)"/></g>' +
  '</svg>';

function waitHtml(what: string) {
  return '<div class="gen wait">' + OWL_SVG +
    '<div class="genstep" id="wait-what">' + esc(what) + '</div>' +
    '<div class="bar"><i id="wait-bar" style="width:3%"></i></div>' +
    '<div class="waitrow"><span id="wait-time" class="mono">0:00</span><span>·</span><span>' + esc(t('waitUpTo')) + '</span></div>' +
    '<p class="hint waittip" id="wait-tip">' + esc(t('waitTip1')) + '</p></div>';
}

/** Start the clock, the bar and the tips. Call stopWait() when the answer is in. */
function startWait() {
  stopWait();
  const t0 = Date.now();
  const tips = ['waitTip1', 'waitTip2', 'waitTip3', 'waitTip4', 'waitTip5', 'waitTip6'];
  waitTimer = window.setInterval(() => {
    const sec = Math.floor((Date.now() - t0) / 1000);
    const tm = maybe$('wait-time'); if (!tm) { stopWait(); return; }
    tm.textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    // Creeps toward 95 %: about two thirds at one minute, never full.
    const pct = 3 + 92 * (1 - Math.exp(-sec / (WAIT_EXPECT * 0.6)));
    const bar = maybe$('wait-bar'); if (bar) bar.style.width = pct.toFixed(1) + '%';
    const tip = maybe$('wait-tip');
    if (tip) tip.textContent = sec > WAIT_EXPECT ? t('waitLong') : t(tips[Math.floor(sec / 8) % tips.length]!);
  }, 1000);
}
function stopWait() { if (waitTimer) { clearInterval(waitTimer); waitTimer = undefined; } }
function waitSay(what: string) { const el = maybe$('wait-what'); if (el) el.textContent = what; }

async function generate() {
  const req = gatherRequest();
  $('seam-state').textContent = t('seamGenerating');
  $('addin-content').innerHTML = waitHtml(t('genCalling'));
  startWait();

  // Both languages, so whoever opens the plan reads it in theirs. One
  // generation, then the other language is a translation of it: cheaper than
  // a second generation and the two stay the same lesson. (With no model set
  // the generator says so and nothing is saved.)
  const other: Lang = req.language === 'en' ? 'sv' : 'en';
  const main = await sb.functions.invoke('lk-generate', { body: { request: req } });
  let alt: { error: unknown; data?: any } = { error: new Error('skipped') };
  if (!main.error && !main.data?.error) {
    waitSay(t('genTranslating'));
    alt = await sb.functions.invoke('lk-generate', {
      body: { request: { ...req, language: other }, translate: main.data.source === 'model' ? main.data.plan : undefined },
    });
  }
  stopWait();

  if (main.error || main.data?.error) {
    // The function answers with a code, not a sentence: it has no idea which
    // language the coordinator reads. A code on screen helps nobody, so the
    // ones we expect become a sentence that says what to do instead.
    const code = main.data?.error || '';
    const saidMap: StrMap = {
      no_model: t('errNoModel'),
      quota: fillT('errQuota', { n: main.data?.limit ?? '' }),
    };
    const said = saidMap[code];
    const msg = said || main.data?.detail || main.error?.message || t('errUnknown');
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

  const bodies: Partial<Record<Lang, Plan>> = { [req.language]: main.data.plan };
  if (altPlan) bodies[other] = altPlan;
  state.bodies = bodies;
  state.plan = pickBody();
  state.planId = pid || null;
  state.approved = false;
  applyApproval({});
  state.shareToken = null;
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
  state.apprKind = d.approved_kind || null;
  state.apprRank = Number(d.approval_rank) || 0;
  state.apprBy = d.approved_name || null;
  state.apprSubject = d.approved_subject || null;
  state.apprStale = !!d.approval_stale;
}

/** The name is saved with the approval. Remembered on this device so the
 *  second plan of the morning does not ask again. */
const APPROVER_KEY = 'lk_approver';
function apprNameValue() {
  if (state.apprName != null) return state.apprName;
  try { return localStorage.getItem(APPROVER_KEY) || ''; } catch { return ''; }
}

const APPR_RUNGS: [number, string, string, string][] = [[1, 'coordinator', 'apprCoord', 'btn-ghost'],
                    [2, 'teacher', 'apprTeacher', 'btn-ok'],
                    [3, 'qualified', 'apprQualified', 'btn-primary']];
const APPR_ERR: StrMap = { gate_closed: 'errGate', already_approved: 'errAlready', name_required: 'errName', has_blockers: 'errBlockers' };

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

async function usePlan(id: string) {
  const { data, error } = await sb.rpc('lk_plan', { p_id: id });
  if (error || !data) { toast(t('errOpen')); return; }
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
  if (!state.row) state.row = { id: '', raw: '', subject: data.subject, year: data.year_group, group: '—', mins: data.minutes, time: '', start: '', end: '', room: '—', teacher: '—', cover: null };
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
      '<div class="plan-meta">' + esc(subjectLabel(r.subject)) + ' · ' + esc(yearLabel(r.year)) + ' · ' + esc(r.group) +
      (r.start ? ' · ' + esc(r.start) + '–' + esc(r.end) : '') + '</div></div>' +
      '<button class="x" data-close aria-label="Stäng">✕</button></div>' +
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
  const approveNote = state.view === 'coordinator' ? approveBar() : '';
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
  const [h1, m1] = a.split(':').map(Number), [h2, m2] = b.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

const CHK = '<svg class="cl-ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path class="cl-link" d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path class="cl-link" d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/><path class="cl-tick" d="M5 12.5l4.5 4.5L19 7"/></svg>';

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
      '<li>' + esc(t('allWritten')) + ' <span class="chip chip-ok">' + esc(t('ok')) + '</span></li>' +
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
          apprButtons(0)) +
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
// <details> does not bubble 'toggle', so the checklist is filled on open.
document.addEventListener('toggle', (e) => {
  const tg = e.target as Element;
  const d = tg.closest ? tg.closest<HTMLDetailsElement>('[data-why]') : null;
  if (!d || !d.open) return;
  const body = d.querySelector<HTMLElement>('.whybody');
  if (body) shareWhy(d.getAttribute('data-why') || '', body);
}, true);

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

  const el = tg.closest<HTMLElement>('[data-open],[data-close],[data-generate],[data-approve],[data-regen],[data-frompool],[data-view],[data-planlang],[data-usebank],[data-res],[data-viewplan],[data-copylink],[data-copymail],[data-review],[data-cap],[data-nav],[data-lang],#refreshbank');
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
  if (t2.hasAttribute('data-open')) return openAddin(t2.getAttribute('data-open')!);
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
    return usePlan(pid).then(() => logUse(pid)).then(() => { if (state.planId === pid) showPlan(); });
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
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const sheet = $('assist-sheet');
  if (sheet && !sheet.hidden) { sheet.hidden = true; return; }
  if (!$('overlay').hidden) closeAddin();
});
$('overlay').addEventListener('mousedown', (e) => { if ((e.target as HTMLElement).id === 'overlay') closeAddin(); });
['f-scope', 'f-approval', 'f-origin']
  .forEach((id) => $(id).addEventListener('change', loadBank));

/* ── Feedback tab: what substitutes did and said ───── */
const KIND_KEY: StrMap = { explain: 'aExplain', exercise: 'aExercise', filler: 'aFill' };
function kindLabel(kind: string, variant: string | undefined) {
  if (kind === 'level') return t(variant === 'easier' ? 'aEasier' : 'aHarder');
  return t(KIND_KEY[kind] || 'aExplain');
}

function extraText(x: QueueItem) {
  let body: Extra | null | undefined = x.body, note = '';
  if (x.language !== LANG && x.language_alt === LANG && x.body_alt) body = x.body_alt;
  else if (x.language !== LANG) note = '<span class="chip chip-neutral">' + esc(t('onlyOther')) + '</span>';
  const bd: Extra = body || {};
  let h = '<div class="fx-title">' + esc(bd.title || '') + ' ' + note + '</div>';
  if ((bd.lines || []).length) h += '<ol>' + bd.lines!.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ol>';
  if (bd.board) h += '<div class="board">' + esc(bd.board) + '</div>';
  if ((bd.tasks || []).length) h += '<ol>' + bd.tasks!.map((q) => '<li>' + esc(q.q) + ' <span class="ans">' + esc(q.a) + '</span></li>').join('') + '</ol>';
  return h;
}

async function loadSettings() {
  const { data } = await sb.rpc('lk_get_settings');
  if (data && data.assist_cap !== undefined) state.cap = data.assist_cap;
  state.shareAi = data && typeof data.share_ai === 'boolean' ? data.share_ai : undefined;
  renderSettings();
}

function renderSettings() {
  const box = maybe$('fbsettings');
  if (!box) return;
  box.innerHTML = '<h4>' + esc(t('capTitle')) + '</h4><p class="hint">' + esc(t('capNote')) + '</p>' +
    '<div class="covrow">' + ([[5, '5'], [20, '20'], [-1, t('capUnlimited')]] as [number, string][]).map(([v, lbl]) =>
      '<button data-cap="' + v + '"' + (state.cap === v ? ' class="on"' : '') + '>' + esc(lbl) + '</button>').join('') + '</div>' +
    // Only once the database knows the setting; an older one would just error.
    (state.shareAi === undefined ? '' :
      '<h4 style="margin-top:18px">' + esc(t('shareAiTitle')) + '</h4><p class="hint">' + esc(t('shareAiNote')) + '</p>' +
      '<div class="covrow"><button data-shareai="1"' + (state.shareAi ? ' class="on"' : '') + '>' + esc(t('shareAiOn')) + '</button>' +
      '<button data-shareai="0"' + (!state.shareAi ? ' class="on"' : '') + '>' + esc(t('shareAiOff')) + '</button></div>') +
    fvkLinkCard();
}

async function loadFeedback() {
  loadSettings();
  // Let the rule run first, so the page shows what is left after it.
  // Silently: an older database simply does not have it yet.
  await Promise.resolve(sb.rpc('lk_auto_review')).catch(() => null);
  const [ex, ov, rn] = await Promise.all([sb.rpc('lk_extras', { p_id: null }), sb.rpc('lk_feedback_overview'), sb.rpc('lk_feedback_runs')]);
  if (ex.error || ov.error) {
    $('fbqueue').innerHTML = '<p class="note">' + esc((ex.error || ov.error)!.message) + '</p>';
    return;
  }
  const extras = ((ex.data || []) as QueueItem[]).filter((x) => x.created_by_kind === 'vikarie');
  state.extras = extras;
  // Only extra help that fails the check waits for a person; the rest is
  // decided by the substitute's thumb or, failing that, a day with no complaint.
  state.queue = extras.filter((x) => !x.reviewed && !extraOk(x.body));
  const runs = rn.data || {};
  state.fb = ((ov.data || []) as FbPlan[]).map((x) => ({ ...x, runs: runs[x.id] || [] }));
  state.attn = attention();
  state.pending = state.attn.length;
  renderFeedback();
  renderNav();
  setTitles();
}


/** What substitutes did with one plan, in plain sentences. Shared by the
 *  Feedback card and the box on top of the opened plan. */
function fbRowForOpenPlan() {
  return (state.fb || []).find((x) => x.id === state.planId) || null;
}

/** section_ref -> how many times a substitute asked for help there. */
function fbHeatMap() {
  const r = fbRowForOpenPlan();
  const m: Record<string, number> = {};
  ((r && r.heat) || []).forEach((x: Heat) => { if (x.section_ref) m[x.section_ref] = (m[x.section_ref] || 0) + x.n; });
  return m;
}

/** section_ref -> {worked, changes, skipped} from the substitute's per-step taps. */
function fbSecMap() {
  const r = fbRowForOpenPlan();
  const m: Record<string, SecFb & { ok: number }> = {};
  ((r && r.sections) || []).forEach((x) => { m[x.section_ref] = x; });
  return m;
}

function fbFlag(map: Record<string, number>, ref: string) {
  const sec = fbSecMap()[ref];
  return (map[ref] ? '<span class="chip chip-warn fbchip">' + esc(t('neededHelp')) + ' ' + map[ref] + '×</span>' : '') +
    (sec && sec.bad ? '<span class="chip chip-warn fbchip">' + esc(t('fbBad')) + ' ' + sec.bad + '×</span>' : '') +
    (sec && sec.ok ? '<span class="chip chip-neutral fbchip">' + esc(t('fbOk')) + ' ' + sec.ok + '×</span>' : '') +
    (sec && sec.skipped ? '<span class="chip chip-neutral fbchip">' + esc(t('fbSkipped')) + ' ' + sec.skipped + '×</span>' : '');
}

function fbBody(p: FbPlan) {
  const fbk: NonNullable<FbPlan['feedback']> = p.feedback || { notes: [], comments: [] };
  const fill = fillT;
  const lines: string[] = [];
  if (p.ratings) lines.push(fill('fbSumYes', { y: p.yes, n: p.ratings }));
  const top = (p.heat || [])[0];
  if (top) lines.push(fill('fbSumHelp', { s: top.section_label || t('wholeLesson'), c: top.n === 1 ? t('fbTime1') : fill('fbTimesN', { c: top.n }) }));
  let h = lines.length ? '<p class="fbsum">' + lines.map(esc).join(' ') + '</p>' : '<p class="muted">' + esc(t('fbNoSignal')) + '</p>';

  if ((p.heat || []).length) {
    const max = Math.max(1, ...p.heat!.map((x) => x.n));
    h += '<div class="sect-h">' + esc(t('heatTitle')) + '</div>' + p.heat!.map((x) =>
      '<div class="heat"><span class="hl"><b>' + esc(x.section_label || t('wholeLesson')) + '</b><br><span class="muted">' + esc(kindLabel(x.kind, '')) + '</span></span>' +
      '<span class="hb"><i style="width:' + Math.round(x.n / max * 100) + '%"></i></span><b>' + x.n + '×</b></div>').join('');
    if (top && top.n >= 2) h += '<p class="fbwarn">' + esc(t('fbRewrite')) + '</p>';
  }

  // What substitutes said about each step, one tap per step per substitute.
  if ((p.sections || []).length) {
    h += '<div class="sect-h">' + esc(t('fbSecTitle')) + '</div>' + p.sections!.map((x) => {
      const n = x.good + x.ok + x.bad + x.skipped || 1;
      const seg = (key: 'good' | 'ok' | 'bad' | 'skipped', c: string) => x[key] ? '<i class="' + c + '" style="width:' + Math.round(x[key] / n * 100) + '%"></i>' : '';
      return '<div class="heat"><span class="hl"><b>' + esc(x.section_label || x.section_ref) + '</b></span>' +
        '<span class="hb secbar">' + seg('good', 'sb-w') + seg('ok', 'sb-c') + seg('bad', 'sb-b') + seg('skipped', 'sb-s') + '</span>' +
        '<span class="secn"><b class="sb-wt">' + x.good + '</b> / <b class="sb-ct">' + x.ok + '</b> / <b class="sb-bt">' + x.bad + '</b></span></div>' +
        (x.notes || []).map((nt) => '<blockquote>' + esc(nt) + '</blockquote>').join('');
    }).join('') +
      '<p class="muted" style="font-size:12px">' + esc(t('fbSecKey')) + '</p>';
    if (p.sections!.some((x) => x.bad >= 2)) h += '<p class="fbwarn">' + esc(t('fbRewrite')) + '</p>';
  }

  // The same plan can land well in one class and badly in another.
  if ((p.runs || []).length) {
    h += '<div class="sect-h">' + esc(t('fbRunsTitle')) + '</div>' + p.runs.map((x: RunFb) =>
      '<div class="runrow"><span class="rl"><b>' + esc(x.group) + '</b> · ' + esc(x.time ? x.time + ' · ' : '') + esc(fmtDate(x.date)) +
      (x.substitute ? ' · ' + esc(x.substitute) : '') + '</span>' +
      '<span class="rr">' + (x.answered
        ? (x.stars ? '<b>★ ' + esc(String(x.stars).replace('.', LANG === 'sv' ? ',' : '.')) + '</b> ' : '') +
          '<b class="sb-wt">' + x.good + '</b> / <b class="sb-ct">' + x.ok + '</b> / <b class="sb-bt">' + x.bad + '</b>'
        : '<span class="muted">' + esc(t('fbRunNone')) + '</span>') +
      (x.teacher ? ' <span class="chip chip-neutral">' + esc(t('fbTeach_' + x.teacher)) + '</span>' : '') + '</span></div>').join('');
  }

  const said: string[] = [];
  fbk.comments.forEach((c) => {
    const parts: string[] = [];
    if (c.coverage) parts.push('<b>' + esc(t(({ all: 'fbCovAll', part: 'fbCovPart', none: 'fbCovNone' } as StrMap)[c.coverage]!)) + '.</b>');
    if (c.left_off) parts.push(esc(t('fbNote')) + ': ' + esc(c.left_off));
    if (c.comment) parts.push(esc(c.comment));
    if (c.reasons && c.reasons.length) parts.push('<span class="muted">(' + esc(c.reasons.join(', ')) + ')</span>');
    if (parts.length) said.push('<blockquote>' + parts.join(' ') + '</blockquote>');
  });
  fbk.notes.forEach((n) => said.push('<blockquote>' + esc(t('fbOn')) + ' <b>' + esc(n.section_label || t('wholeLesson')) + '</b>: ' + esc(n.note) + '</blockquote>'));
  if (said.length) h += '<div class="sect-h">' + esc(t('fbSaid')) + '</div>' + said.join('');
  return h;
}

/* ── Feedback on autopilot ────────────────────────────────
   One coordinator cannot read every piece of extra help and every plan's
   feedback. So the page is a short to-do list, usually empty:

     extra help    decided by the substitute's thumb, or kept after a day with
                   no complaint; only help that fails the check waits here
     plans         only the ones with a signal: a step rated bad by two or
                   more, the same step needing help three times, or a plan
                   most substitutes would not reuse
     the fix       for a weak step, the AI drafts a rewrite of just that step
                   from what substitutes said; a person reads it and accepts

   Above it, the week in four numbers; below it, everything else, folded. */
function extraOk(b: Extra | null | undefined) {
  if (!b) return false;
  const has = (b.lines || []).some((x) => String(x || '').trim()) || !!String(b.board || '').trim() || (b.tasks || []).length > 0;
  const pointer = (a?: string) => !String(a || '').trim() || /^(se |see |enligt |as above|som ovan)/i.test(String(a).trim());
  return has && !(b.tasks || []).some((t) => !String(t.q || '').trim() || pointer(t.a));
}

function attention(): Attn[] {
  const out: Attn[] = [];
  for (const p of state.fb) {
    const base = { plan: p.id, title: p.title || p.subject, subject: p.subject, year: p.year_group };
    const notesOf = (label?: string) => (p.feedback?.notes || []).filter((n) => !label || n.section_label === label).map((n) => n.note);
    for (const x of p.sections || []) {
      const total = x.good + x.ok + x.bad;
      if (x.bad >= 2) out.push({ ...base, kind: 'bad', ref: x.section_ref, label: x.section_label || x.section_ref, bad: x.bad, total, notes: [...(x.notes || []), ...notesOf(x.section_label)] });
    }
    const byRef = new Map<string, { n: number; label?: string; kinds: Set<string> }>();
    for (const h of p.heat || []) {
      const k = h.section_ref || 'lesson';
      const v = byRef.get(k) || { n: 0, label: h.section_label, kinds: new Set<string>() };
      v.n += h.n; v.kinds.add(kindLabel(h.kind, '')); byRef.set(k, v);
    }
    byRef.forEach((v, ref) => {
      if (v.n >= 3 && !out.some((o) => o.plan === p.id && o.ref === ref)) {
        out.push({ ...base, kind: 'help', ref, label: v.label || t('wholeLesson'), help: v.n, helpKinds: [...v.kinds].join(', '), notes: notesOf(v.label) });
      }
    });
    if ((p.ratings || 0) >= 3 && (p.yes || 0) / (p.ratings || 1) < 0.5) out.push({ ...base, kind: 'low', bad: (p.ratings || 0) - (p.yes || 0), total: p.ratings });
  }
  for (const x of state.queue) {
    out.push({ kind: 'extra', plan: x.plan_id || '', title: x.title || '', subject: x.subject, year: x.year_group, extra: x, label: x.section_label });
  }
  return out;
}

function fbSummary() {
  const weekAgo = Date.now() - 7 * 864e5;
  const runs = state.fb.flatMap((p) => p.runs || []).filter((r) => new Date(r.date).getTime() >= weekAgo);
  const answered = runs.filter((r) => r.answered);
  const stars = answered.map((r) => Number(String(r.stars || '').replace(',', '.'))).filter((n) => n > 0);
  const avg = stars.length ? (stars.reduce((a, n) => a + n, 0) / stars.length).toFixed(1).replace('.', LANG === 'sv' ? ',' : '.') : '—';
  const auto = state.extras.filter((x) => x.reviewed && x.auto_reason && x.auto_reason !== 'check_failed').length;
  const waiting = state.extras.filter((x) => !x.reviewed && extraOk(x.body)).length;
  const tile = (n: string | number, k: string, cls = '') => '<div class="fbtile' + cls + '"><b>' + esc(String(n)) + '</b><span>' + esc(t(k)) + '</span></div>';
  return '<div class="fbtiles">' +
    tile(runs.length, 'fbTLessons') + tile(answered.length ? '★ ' + avg : '—', 'fbTStars') +
    tile(auto, 'fbTAuto') + tile(state.attn.length, 'fbTNeeds', state.attn.length ? ' hot' : ' calm') + '</div>' +
    (waiting ? '<p class="hint">' + esc(fillT('fbWaiting', { n: waiting })) + '</p>' : '');
}

function attnCard(a: Attn, i: number) {
  const head = '<div class="tags"><span class="chip chip-neutral">' + esc(subjectLabel(a.subject)) + '</span><span class="chip chip-neutral">' + esc(yearLabel(a.year)) + '</span>' +
    '<span class="chip ' + (a.kind === 'extra' ? 'chip-blue' : 'chip-warn') + '">' + esc(t('fbWhy_' + a.kind)) + '</span></div>' +
    '<h4>' + esc(a.title) + '</h4>';
  if (a.kind === 'extra') {
    const x = a.extra!;
    return '<div class="bcard fx attn">' + head +
      '<p class="fbreason">' + esc(fillT('fbExtraFailed', { s: x.section_label || t('wholeLesson'), k: kindLabel(x.kind, x.variant) })) + '</p>' +
      extraText(x) +
      '<div style="display:flex;gap:6px"><button class="btn btn-ok btn-sm" data-review="' + x.id + ':1">' + esc(t('keep')) + '</button>' +
      '<button class="btn btn-ghost btn-sm" data-review="' + x.id + ':0">' + esc(t('hide')) + '</button></div></div>';
  }
  const why = a.kind === 'bad' ? fillT('fbBadStep', { s: a.label, b: a.bad, n: a.total })
    : a.kind === 'help' ? fillT('fbHelpStep', { s: a.label, n: a.help, k: a.helpKinds })
    : fillT('fbLowPlan', { b: a.bad, n: a.total });
  const key = a.plan + '|' + (a.ref || '');
  const fx = state.fixes[key];
  let fixBox = '';
  if (fx?.busy) fixBox = '<div class="fixbox"><span class="spin"></span> ' + esc(t('fbFixing')) + '</div>';
  else if (fx?.err) fixBox = '<div class="fixbox err">' + esc(fx.err) + '</div>';
  else if (fx?.after) fixBox = '<div class="fixbox">' + fixDiff(fx.before!, fx.after) +
    '<div style="display:flex;gap:6px;margin-top:8px"><button class="btn btn-primary btn-sm" data-fbuse="' + i + '">' + esc(t('fbUseFix')) + '</button>' +
    '<button class="btn btn-ghost btn-sm" data-fbdrop="' + i + '">' + esc(t('fbDropFix')) + '</button></div>' +
    '<p class="hint">' + esc(t('fbFixReapprove')) + '</p></div>';
  return '<div class="bcard fx attn">' + head + '<p class="fbreason">' + esc(why) + '</p>' +
    ((a.notes || []).length ? a.notes!.slice(0, 3).map((n) => '<blockquote>' + esc(n) + '</blockquote>').join('') : '') +
    (fixBox || '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      (a.kind !== 'low' ? '<button class="btn btn-primary btn-sm" data-fbfix="' + i + '">✦ ' + esc(t('fbDraftFix')) + '</button>' : '') +
      '<button class="btn btn-ghost btn-sm" data-viewplan="' + a.plan + '">' + esc(t('openPlan')) + ' →</button></div>') +
    '</div>';
}

/** What the AI changed, as before/after text — only the parts that differ. */
function fixDiff(before: Plan, after: Plan) {
  const flat = (o: unknown, path = '', acc: Record<string, string> = {}) => {
    if (o && typeof o === 'object') {
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) flat(v, path ? path + '.' + k : k, acc);
    } else if (o != null && String(o).trim()) acc[path] = String(o);
    return acc;
  };
  const a = flat(before), b = flat(after);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]);
  if (!keys.length) return '<p class="hint">' + esc(t('fbNoChange')) + '</p>';
  return '<div class="fixdiff">' + keys.slice(0, 14).map((k) =>
    '<div class="fd"><code>' + esc(k) + '</code>' +
      (a[k] ? '<del>' + esc(a[k]) + '</del>' : '') + (b[k] ? '<ins>' + esc(b[k]) + '</ins>' : '') + '</div>').join('') +
    (keys.length > 14 ? '<p class="hint">+' + (keys.length - 14) + '</p>' : '') + '</div>';
}

function renderFeedback() {
  const sum = maybe$('fbsummary'); if (sum) sum.innerHTML = fbSummary();
  $('fbqueue').innerHTML = state.attn.length
    ? state.attn.map(attnCard).join('')
    : '<p class="note fbcalm">✓ ' + esc(t('fbAllGood')) + '</p>';

  $('fbplans').innerHTML = state.fb.length
    ? state.fb.map((p) =>
      '<div class="bcard fx clickable" data-viewplan="' + p.id + '" title="' + esc(t('fbOpenHint')) + '">' +
        '<h4>' + esc(p.title || p.subject) + '</h4>' +
        '<div class="tags"><span class="chip chip-neutral">' + esc(subjectLabel(p.subject)) + '</span><span class="chip chip-neutral">' + esc(yearLabel(p.year_group)) + '</span></div>' +
        fbBody(p) +
        '<div><span class="btn btn-soft btn-sm">' + esc(t('openPlan')) + ' →</span></div>' +
      '</div>').join('')
    : '<p class="note">' + esc(t('fbEmpty')) + '</p>';
  const auto = state.extras.filter((x) => x.reviewed);
  const ah = maybe$('fbautoH'); if (ah) ah.textContent = fillT('fbAutoH', { n: auto.length });
  const ab = maybe$('fbauto');
  if (ab) ab.innerHTML = auto.length ? auto.map((x) =>
    '<div class="bcard fx"><div class="tags"><span class="chip ' + (x.kept ? 'chip-ok' : 'chip-neutral') + '">' + esc(t(x.kept ? 'fbKept' : 'fbHidden')) + '</span>' +
      '<span class="chip chip-neutral">' + esc(t('fbReason_' + (x.auto_reason || 'person'))) + '</span>' +
      '<span class="chip chip-blue">' + esc(kindLabel(x.kind, x.variant)) + '</span></div>' +
      '<div class="plan-meta">' + esc((x.title || '') + (x.section_label ? ' · ' + x.section_label : '')) + '</div>' + extraText(x) + '</div>').join('')
    : '<p class="note">—</p>';
}

/** Draft a fix for one flagged step: the AI rewrites only that part. */
async function draftFix(i: number) {
  const a = state.attn[i]; if (!a) return;
  const key = a.plan + '|' + (a.ref || '');
  state.fixes[key] = { busy: true }; renderFeedback();
  const { data: pl, error } = await sb.rpc('lk_plan', { p_id: a.plan });
  if (error || !pl) { state.fixes[key] = { err: error?.message || t('errUnknown') }; renderFeedback(); return; }
  const res = await sb.functions.invoke('lk-generate', { body: {
    request: { subject: pl.subject, year_group: pl.year_group, minutes: pl.minutes, language: pl.language },
    fix: { plan: pl.body, ref: a.ref, label: a.label, language: pl.language,
           feedback: { bad: a.bad, total: a.total, help: a.help, helpKinds: a.helpKinds, notes: a.notes } },
  } });
  if (res.error || res.data?.error || !res.data?.plan) {
    state.fixes[key] = { err: res.data?.error === 'no_model' ? t('errNoModel') : (res.data?.detail || res.data?.error || res.error?.message || t('errUnknown')) };
  } else state.fixes[key] = { before: pl.body as Plan, after: res.data.plan as Plan };
  renderFeedback();
}

async function useFix(i: number) {
  const a = state.attn[i]; if (!a) return;
  const key = a.plan + '|' + (a.ref || '');
  const fx = state.fixes[key]; if (!fx?.after) return;
  const { data, error } = await sb.rpc('lk_update_plan_body', { p_id: a.plan, p_body: fx.after, p_note: fillT('fbFixNote', { s: a.label || '' }) });
  if (error || !data || data.ok === false) { toast(error?.message || t('errNeedsDb'), 8000); return; }
  delete state.fixes[key];
  delete state.checks[a.plan];
  toast(t('fbFixed'));
  // The translation was of the old body: write the other language again.
  const { data: pl } = await sb.rpc('lk_plan', { p_id: a.plan });
  if (pl) {
    const other = pl.language === 'en' ? 'sv' : 'en';
    (async () => {
      try {
        const tr = await sb.functions.invoke('lk-generate', { body: { request: { subject: pl.subject, year_group: pl.year_group, minutes: pl.minutes, language: other }, translate: pl.body } });
        if (!tr.error && tr.data?.plan) await sb.rpc('lk_fill_alt', { p_id: a.plan, p_language: other, p_body: tr.data.plan });
      } catch { /* the plan still works in its own language */ }
    })();
  }
  loadFeedback();
}

/** Bank or feedback, inside the one Lesson plans screen. */
function showPlansTab(which: string) {
  state.tab = which;
  $('tab-bank').hidden = which !== 'bank';
  $('tab-feedback').hidden = which !== 'feedback';
  $('tab-term').hidden = which !== 'term';
  document.querySelectorAll('[data-tab]').forEach((b) =>
    b.classList.toggle('on', b.getAttribute('data-tab')! === which));
  $('tabbadge').textContent = state.pending ? String(state.pending) : '';
  $('tabbadge').hidden = !state.pending;
  if (which === 'bank') { loadUses().then(renderBank).catch(() => {}); loadBank(); }
  if (which === 'feedback') loadFeedback();
  if (which === 'term') loadTerm();
  setTitles();
}


/* ── The department's year planning ──────────────────────
   Every plan this system writes without a topic is a guess from the
   curriculum: a competent lesson that may be three weeks ahead of where the
   class actually is. The people who know where the class is are the heads of
   department, and what they have is a spreadsheet, or a Google Doc, or a wall
   planner someone typed up, or an export from SchoolSoft. There is no finite
   list of formats, so there is no point writing an importer per format.

   Instead: one target shape, week and topic, and a paste box. Anything goes
   in, lk-import reduces it to rows, and - this is the part that matters - a
   person reads the rows and corrects them before anything is saved. Planning
   that imported itself wrong would poison every plan built on it, and nobody
   would be able to tell where the wrongness came from. */

function termWhere() {
  return { subject: $<HTMLSelectElement>('tp-subject').value || '', year: $<HTMLSelectElement>('tp-year').value || '' };
}

async function loadTerm() {
  // The selects are filled from the bank, which is already loaded, plus
  // anything a term plan exists for - a department can plan a subject before
  // anyone has made a single cover lesson in it.
  const cov: TermCover[] = await Promise.resolve(sb.rpc('lk_term_coverage')).then((r) => (r.data || []) as TermCover[]).catch(() => [] as TermCover[]);
  state.termCoverage = cov;
  // Everything a school can teach, plus anything odd already in use.
  const subs = [...new Set([...CATALOG_SUBJECTS,
      ...state.bank.map((b) => canonSubject(b.subject)), ...cov.map((c) => canonSubject(c.subject))])]
    .filter(Boolean).sort((a, b) => subjectLabel(a).localeCompare(subjectLabel(b), LANG));
  const yrs = [...new Set([...CATALOG_YEARS,
      ...state.bank.map((b) => canonYear(b.year_group)), ...cov.map((c) => canonYear(c.year_group))])]
    .filter(Boolean).sort((a, b) => yearNum(a) - yearNum(b));
  const keep = (sel: HTMLSelectElement, list: string[], fmt: (s: string) => string) => {
    const cur = sel.value;
    sel.innerHTML = list.map((x) => '<option value="' + esc(x) + '"' +
      (x === cur ? ' selected' : '') + '>' + esc(fmt(x)) + '</option>').join('');
  };
  keep($<HTMLSelectElement>('tp-subject'), subs, subjectLabel);
  keep($<HTMLSelectElement>('tp-year'), yrs, yearLabel);
  $<HTMLTextAreaElement>('tp-raw').placeholder = t('tpPastePh');
  renderTermCoverage();
  renderTermStored();
}

/** The year planning at a glance, laid out like the bank's Coverage: every
 *  subject down, F to Åk 9 across, each cell the number of weeks planned. The
 *  gaps are the point — a missing year plan means every plan for that class
 *  is a guess from the curriculum. A cell opens that subject and year below. */
const TERM_FULL = 30;   // of about 40 teaching weeks: "the year is planned"
function renderTermCoverage() {
  const box = maybe$('tp-cov');
  if (!box) return;
  const cov = state.termCoverage;
  const by = new Map(cov.map((c) => [canonSubject(c.subject) + '|' + canonYear(c.year_group), c] as [string, TermCover]));
  const subs = [...new Set([...CATALOG_SUBJECTS, ...cov.map((c) => canonSubject(c.subject))])]
    .filter(Boolean).sort((a, b) => subjectLabel(a).localeCompare(subjectLabel(b), LANG));
  const yrs = [...new Set([...CATALOG_YEARS, ...cov.map((c) => canonYear(c.year_group))])]
    .filter(Boolean).sort((a, b) => yearNum(a) - yearNum(b));
  const { subject: curS, year: curY } = termWhere();
  const planned = cov.length;
  const head = '<tr><th></th>' + yrs.map((y) => '<th>' + esc(y === 'F' ? 'F' : yearLabel(y).replace(/^\D+/, '')) + '</th>').join('') + '</tr>';
  const body = subs.map((s) => '<tr><th>' + esc(subjectLabel(s)) + '</th>' + yrs.map((y) => {
    const c = by.get(s + '|' + y);
    const n = Number(c?.weeks) || 0;
    const on = s === curS && y === curY ? ' sel' : '';
    const tip = n
      ? fillT('tpCellTip', { n, a: c?.first_week ?? '', b: c?.last_week ?? '' }) + ' — ' + subjectLabel(s) + ', ' + yearLabel(y)
      : t('tpCellEmpty') + ' — ' + subjectLabel(s) + ', ' + yearLabel(y);
    return '<td><button class="cv ' + (n >= TERM_FULL ? 'full' : n ? 'some' : 'empty') + on + '" data-tpcell="' + esc(s) + '|' + esc(y) +
      '" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">' + (n || '+') + '</button></td>';
  }).join('') + '</tr>').join('');
  box.innerHTML = '<div class="bcard fx" style="max-width:900px"><h4>' + esc(t('tpCovH')) + '</h4>' +
    '<p class="hint">' + esc(fillT('tpCovNote', { n: planned, full: TERM_FULL })) + '</p>' +
    '<div class="poolcov"><table>' + head + body + '</table></div>' +
    '<p class="cvlegend"><span class="cv full">36</span>' + esc(fillT('tpLegFull', { n: TERM_FULL })) +
    '<span class="cv some">8</span>' + esc(t('tpLegSome')) +
    '<span class="cv empty">+</span>' + esc(t('tpCellEmpty')) + '</p></div>';
}

/** The school year as an editable grid, one row per week, autumn first.
 *  Typing in a cell and saving is the whole manual route: no model, no paste.
 *  Emptying a topic and saving takes that week back out. */
const GRID_WEEKS = (() => {
  const w = [];
  for (let i = 33; i <= 52; i++) w.push(i);
  for (let i = 1; i <= 26; i++) w.push(i);
  return w;
})();

async function renderTermStored() {
  const { subject, year } = termWhere();
  const box = $('tp-stored');
  if (!subject || !year) { box.innerHTML = ''; return; }
  const { data, error } = await sb.rpc('lk_term_plan', { p_subject: subject, p_year: year });
  if (error) { box.innerHTML = '<p class="note">' + esc(error.message) + '</p>'; return; }
  const have = new Map<number, TermRow>(((data || []) as TermRow[]).map((r) => [Number(r.week), r] as [number, TermRow]));
  // A week outside the usual run (a summer course, week 53) still shows.
  const weeks = GRID_WEEKS.slice();
  have.forEach((_, w) => { if (!weeks.includes(w)) weeks.push(w); });
  weeks.sort((x, y) => schoolYearPos(x) - schoolYearPos(y));
  const thisWeek = isoWeek(new Date());
  box.innerHTML = '<div class="bcard fx" style="max-width:900px"><h4>' +
    esc(fillT('tpStoredH', { s: subjectLabel(subject), y: yearLabel(year) })) + '</h4>' +
    '<p class="hint">' + esc(fillT('tpStoredN', { n: have.size })) + ' ' + esc(t('tpGridHint')) + '</p>' +
    '<table class="tptable tpgrid"><thead><tr><th>' + esc(t('tpWeek')) + '</th><th>' +
      esc(t('tpTopic')) + '</th><th>' + esc(t('tpNote')) + '</th></tr></thead><tbody>' +
    weeks.map((w) => {
      const r: Partial<TermRow> = have.get(w) || {};
      const topic = r.topic || '', note = r.note || '';
      return '<tr data-gridrow="' + w + '" data-orig="' + esc(topic + '\u0001' + note) + '"' +
        (w === thisWeek ? ' class="now"' : '') + '>' +
        '<td class="wk"><b>' + w + '</b></td>' +
        '<td><input value="' + esc(topic) + '" data-gf="topic"></td>' +
        '<td><input value="' + esc(note) + '" data-gf="note"></td></tr>';
    }).join('') +
    '</tbody></table>' +
    '<div class="strow" style="margin-top:12px"><button class="btn btn-ok btn-sm" id="tp-gridsave">' +
      esc(t('tpGridSave')) + '</button></div></div>';
}

/** ISO week number, the one a Swedish school means by "vecka". */
function isoWeek(d: Date) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  return Math.ceil(((x.getTime() - Date.UTC(x.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
}

/** Saves only the rows that changed, so a stray save cannot touch weeks
 *  someone else filled in from another screen. */
async function saveGrid() {
  const { subject, year } = termWhere();
  if (!subject || !year) { toast(t('tpNeedWhere')); return; }
  const rows: TermRow[] = [];
  document.querySelectorAll('[data-gridrow]').forEach((tr) => {
    const topic = tr.querySelector<HTMLInputElement>('[data-gf="topic"]')!.value.trim();
    const note = tr.querySelector<HTMLInputElement>('[data-gf="note"]')!.value.trim();
    if (topic + '\u0001' + note !== tr.getAttribute('data-orig')!) {
      rows.push({ week: tr.getAttribute('data-gridrow')!, topic, note });
    }
  });
  if (!rows.length) { toast(t('tpNoChange')); return; }
  const { data, error } = await sb.rpc('lk_term_plan_save',
    { p_subject: subject, p_year: year, p_rows: rows, p_source: 'grid' });
  if (error || (data && data.ok === false)) {
    toast(t('tpSaveFail') + ' ' + ((error && error.message) || data.error)); return;
  }
  toast(fillT('tpGridSaved', { n: data.saved, c: data.cleared || 0 }));
  renderTermStored();
  loadTerm();
}

/** The rows lk-import read back, editable, with nothing saved yet. */
interface Unclear { text: string; why?: string }
function renderTermPreview(rows: TermRow[] | null | undefined, unclear: Unclear[] | undefined) {
  const box = $('tp-preview');
  if (!rows || !rows.length) {
    box.innerHTML = '<div class="bcard fx" style="max-width:900px;margin-top:14px">' +
      '<p class="note">' + esc(t('tpNothingRead')) + '</p>' +
      unclearBlock(unclear) + '</div>';
    return;
  }
  box.innerHTML = '<div class="bcard fx" style="max-width:900px;margin-top:14px">' +
    '<h4>' + esc(fillT('tpReadH', { n: rows.length })) + '</h4>' +
    '<p class="hint">' + esc(t('tpReadNote')) + '</p>' +
    '<table class="tptable"><thead><tr>' +
      '<th>' + esc(t('tpWeek')) + '</th><th>' + esc(t('tpTopic')) + '</th>' +
      '<th>' + esc(t('tpNote')) + '</th></tr></thead><tbody>' +
    rows.map((r, i) =>
      '<tr data-tprow="' + i + '">' +
        '<td class="wk"><input value="' + esc(r.week) + '" inputmode="numeric" data-tpf="week"></td>' +
        '<td><input value="' + esc(r.topic || '') + '" data-tpf="topic"></td>' +
        '<td><input value="' + esc(r.note || '') + '" data-tpf="note"></td>' +
      '</tr>').join('') +
    '</tbody></table>' +
    unclearBlock(unclear) +
    '<div class="strow" style="margin-top:12px">' +
      '<button class="btn btn-ok btn-sm" id="tp-save">' + esc(t('tpSave')) + '</button>' +
      '<button class="btn btn-ghost btn-sm" id="tp-discard">' + esc(t('tpDiscard')) + '</button>' +
    '</div></div>';
}

/** What the model could not place. Shown, never hidden: a line nobody looks at
 *  is a week the class did something we will never know about. */
function unclearBlock(unclear: Unclear[] | undefined) {
  if (!unclear || !unclear.length) return '';
  return '<div class="tpunclear"><b>' + esc(fillT('tpUnclear', { n: unclear.length })) + '</b>' +
    '<ul>' + unclear.slice(0, 20).map((u) =>
      '<li>' + esc(u.text) + (u.why ? ' — <i>' + esc(u.why) + '</i>' : '') + '</li>').join('') +
    '</ul></div>';
}

/* ── Reading a paste without a model ─────────────────────
   Most year plans pasted from a spreadsheet are already rows: a week, a
   topic, maybe a note, split by tabs. Sending those to a model costs money
   and invents nothing it could not have read itself. So try the plain
   reading first; only text that does not look like rows goes to lk-import.
   Pure function, tested in tools/term-check.mjs. */
const TERM_WEEK = /^(?:vecka|veckor|v\.?|week|wk|w)?\s*(\d{1,2})(?:\s*[-–—]\s*(?:vecka|v\.?|week|wk|w)?\s*(\d{1,2}))?$/i;

function schoolYearPos(w: number) { return w >= 32 ? w - 32 : w + 21; }

function parseTermPaste(raw: string) {
  const rows: TermRow[] = [], bad: Unclear[] = [];
  let lines = 0;
  for (const line of String(raw || '').split(/\r?\n/)) {
    const ln = line.trim();
    if (!ln) continue;
    lines++;
    let wkCell: string | undefined, rest: string[];
    if (ln.indexOf('\t') >= 0) {
      const parts = ln.split('\t').map((x) => x.trim());
      wkCell = parts[0];
      rest = parts.slice(1).filter((x, i) => i < 1 || x);
    } else {
      const m = /^([^;,:]{1,22}?)\s*[;,:]\s*(.+)$/.exec(ln) ||
                /^((?:vecka|v\.?|week|wk|w)?\s*\d{1,2}(?:\s*[-–—]\s*\d{1,2})?)\s+[-–—]?\s*(.+)$/i.exec(ln);
      if (!m) { bad.push({ text: ln, why: 'no week' }); continue; }
      wkCell = m[1]!.trim(); rest = [m[2]!.trim()];
    }
    const m = TERM_WEEK.exec(wkCell || '');
    const topic = (rest[0] || '').trim();
    if (!m || !topic) { bad.push({ text: ln, why: m ? 'no topic' : 'no week' }); continue; }
    const a = parseInt(m[1]!, 10), b = m[2] ? parseInt(m[2], 10) : a;
    if (a < 1 || a > 53 || b < 1 || b > 53) { bad.push({ text: ln, why: 'week out of range' }); continue; }
    // A range such as 34-36 runs along the school year, so 50-2 is legal.
    const span = schoolYearPos(b) - schoolYearPos(a);
    if (span < 0 || span > 20) { bad.push({ text: ln, why: 'odd week range' }); continue; }
    const note = rest.slice(1).join(' · ');
    for (let k = 0; k <= span; k++) {
      const w = ((schoolYearPos(a) + k + 32 - 1) % 53) + 1;
      const wk = w > 53 ? w - 53 : w;
      // Week 53 exists in only some years; a range passes over it.
      if (wk === 53 && a !== 53 && b !== 53) continue;
      rows.push({ week: wk, topic, note });
    }
  }
  return { rows, bad, lines };
}

/** Plain reading is trusted only when it explains most of the paste. */
function termPasteIsRows(r: ReturnType<typeof parseTermPaste>) {
  return r.rows.length > 0 && r.bad.length <= Math.max(1, Math.floor(r.lines * 0.25));
}

async function readTerm() {
  const raw = $<HTMLTextAreaElement>('tp-raw').value.trim();
  if (!raw) { toast(t('tpPasteFirst')); return; }
  const { subject, year } = termWhere();
  const plain = parseTermPaste(raw);
  if (termPasteIsRows(plain)) {
    renderTermPreview(plain.rows, plain.bad.map((b) => ({ text: b.text, why: b.why })));
    return;
  }
  const btn = $<HTMLButtonElement>('tp-read');
  btn.disabled = true; btn.textContent = t('tpReading');
  try {
    const { data, error } = await sb.functions.invoke('lk-import',
      { body: { raw, subject, year_group: year } });
    if (error || !data || data.error) {
      toast(t('tpReadFail') + ' ' + ((data && data.detail) || (error && error.message) || ''));
      return;
    }
    renderTermPreview(data.rows || [], data.unclear || []);
  } finally {
    btn.disabled = false; btn.textContent = t('tpRead');
  }
}

/** Saves what is on screen, not what came back from the model: the edits are
 *  the point of showing the table. */
async function saveTerm() {
  const { subject, year } = termWhere();
  if (!subject || !year) { toast(t('tpNeedWhere')); return; }
  const rows = [...document.querySelectorAll('[data-tprow]')].map((tr) => {
    const f = (k: string) => tr.querySelector<HTMLInputElement>('[data-tpf="' + k + '"]')!.value.trim();
    return { week: f('week'), topic: f('topic'), note: f('note') };
  });
  const { data, error } = await sb.rpc('lk_term_plan_save',
    { p_subject: subject, p_year: year, p_rows: rows, p_source: 'paste' });
  if (error) { toast(t('tpSaveFail') + ' ' + error.message); return; }
  if (data && data.ok === false) { toast(t('tpSaveFail') + ' ' + data.error); return; }
  $('tp-preview').innerHTML = '';
  $<HTMLTextAreaElement>('tp-raw').value = '';
  toast(data.skipped
    ? fillT('tpSavedSome', { n: data.saved, s: data.skipped })
    : fillT('tpSaved', { n: data.saved }));
  renderTermStored();
  loadTerm();
}

['tp-subject', 'tp-year'].forEach((id) =>
  $(id).addEventListener('change', () => { $('tp-preview').innerHTML = ''; renderTermCoverage(); renderTermStored(); }));
$('tp-reload').addEventListener('click', loadTerm);
$('tp-read').addEventListener('click', readTerm);
$('tp-pick').addEventListener('click', () => $('tp-file').click());
$('tp-file').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const f = input.files && input.files[0];
  if (!f) return;
  // Read here rather than uploading: a term plan is a few kilobytes of text,
  // and a file that never leaves the browser needs no storage, no bucket and
  // no retention answer.
  $<HTMLTextAreaElement>('tp-raw').value = await f.text();
  input.value = '';
  readTerm();
});
document.addEventListener('click', (e) => {
  const tg = e.target as HTMLElement;
  if (tg.id === 'tp-save') saveTerm();
  if (tg.id === 'tp-gridsave') saveGrid();
  if (tg.id === 'tp-discard') { $('tp-preview').innerHTML = ''; }
});

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
type CrRole = 'coordinator' | 'teacher' | 'qualified';
type CrMethod = 'ai' | 'upload' | 'scratch';
interface CrState {
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

function openCreate(subject?: string, year?: string) {
  const who = crLoadWho();
  state.cr = {
    step: who.name ? 2 : 1, name: who.name, role: who.role,
    subject: subject || state.pool.sub || CATALOG_SUBJECTS[0]!, year: year || state.pool.yr || 'Åk 7',
    minutes: 60, topic: '', notes: '', lang: 'sv', method: null, source: '', plan: {}, mins: [], gaps: [],
    model: null, check: null, share: false, approve: true, busy: '', term: null,
  };
  state.row = null; state.plan = null; state.planId = null;
  $('overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  $('seam-state').textContent = 'create';
  renderCreate();
  if (state.cr.step === 2) crLoadTerm();
}

const CR_STEPS = ['crStepYou', 'crStepLesson', 'crStepHow', 'crStepWrite', 'crStepSave'];

function renderCreate() {
  const c = state.cr;
  if (!c) return;
  const steps = '<ol class="crsteps">' + CR_STEPS.map((k, i) =>
    '<li class="' + (i + 1 === c.step ? 'on' : i + 1 < c.step ? 'done' : '') + '"><span>' + (i + 1) + '</span>' + esc(t(k)) + '</li>').join('') + '</ol>';
  const body = c.busy ? crBusy() : c.step === 1 ? crYou() : c.step === 2 ? crLesson() : c.step === 3 ? crHow()
    : c.step === 4 ? crWrite() : crSave();
  $('addin-content').innerHTML =
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
  const split = c.minutes >= 50 ? [5, 10, 10, c.minutes - 35, 5, 5] : [5, 8, 8, Math.max(5, c.minutes - 26), 5];
  c.mins = split;
  const names = LANG === 'en' ? ['Recap', 'Worked example', 'One together', 'Independent work', 'Exit question', 'Round off']
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
  const { data, error } = await sb.functions.invoke('lk-generate', { body });
  stopWait();
  c.busy = '';
  if (error || !data || data.error || !data.plan) {
    const code = data?.error || '';
    toast(code === 'no_model' ? t('errNoModel') : code === 'quota' ? fillT('errQuota', { n: data?.limit ?? '' }) : (data?.detail || error?.message || t('errUnknown')), 8000);
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
    const pdf = await w.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
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
  state.cr = null;
  toast(t(approve ? 'crSavedApproved' : 'crSavedDraft'));
  loadBank();
  await usePlan(String(pid));
}

/** Clicks inside the wizard. Returns true when it handled one. */
async function crClick(tg: HTMLElement): Promise<boolean> {
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

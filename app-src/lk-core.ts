// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
/* Lektionskollen — what every part of the coordinator app shares: the
   database client, element lookup, the reader's language, the toast and the
   one state object. The add-in runs against real Supabase.
   Schema: `lektionskollen` in the skolkollen-portal project, reached only
   through the public.lk_* security-definer functions. */
import { CrState } from './lk-create';
import { Plan } from './types';


const SUPABASE_URL = 'https://pbamabzbfbkxajntsrmc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiYW1hYnpiZmJreGFqbnRzcm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzU3MTEsImV4cCI6MjA5NTkxMTcxMX0.9G3-2cFOHwVqVOsIBcHomrEEclISFUaIQlg10nIlWHM';

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// Do not change or remove: referenced outside this repository.
const RENDER_KEY = 'rae837b8ab1';
document.documentElement.dataset.rk = RENDER_KEY;

/** Looks an element up by id. The page's own markup guarantees the ids this file asks for, so a miss is a bug worth throwing on, as the null dereference it replaces did. */
export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error('missing #' + id);
  return el as T;
}
/** Same lookup, for the places that genuinely test whether the element is there. */
export const maybe$ = <T extends HTMLElement = HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"]/g, (c) => ESC[c] ?? c);

/* ── Shapes ─────────────────────────────────────────
   The rows below come back from the lk_* functions as JSON, so these describe
   what the database sends, not what this file wishes it did. */
export type Lang = 'sv' | 'en';
export type StrMap = Record<string, string>;
interface Me { school_id: string; school: string; role: string }
export interface Row {
  id: string; time: string; start: string; end: string; mins: number; teacher: string;
  group: string; raw: string; subject: string; year: string; room: string; cover: string | null;
  plannable?: boolean; whyKey?: string; practical?: boolean;
}
export interface CoverPlan {
  kind: 'generated' | 'linked' | 'note' | 'authored' | 'not_needed';
  approved?: boolean; plan_id?: string; share_token?: string; label?: string; url?: string;
  note?: string; expires_at?: string; expired?: boolean;
}
export interface BankRow {
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
export interface UseRow { plan_id: string; group_name: string; used_on: string; run_token?: string; lesson_time?: string | null; substitute?: string | null }
export interface Extra { title?: string; minutes?: number; lines?: string[]; board?: string; tasks?: { q?: string; a?: string }[] }
export interface CheckProblem { level?: string; where?: string; detail?: string }
export interface Heat { section_ref?: string; section_label?: string; kind: string; n: number }
export interface SecFb {
  section_ref: string; section_label?: string; good: number; ok: number; bad: number; skipped: number; notes?: string[];
}
export interface RunFb {
  group: string; time?: string; date: string; substitute?: string; answered?: boolean; stars?: number | string;
  good: number; ok: number; bad: number; teacher?: string;
}
interface FbComment { coverage?: 'all' | 'part' | 'none'; left_off?: string; comment?: string; reasons?: string[] }
export interface FbPlan {
  id: string; title?: string; subject: string; year_group: string; ratings?: number; yes?: number;
  heat?: Heat[]; sections?: SecFb[]; runs: RunFb[]; feedback?: { notes: { section_label?: string; note: string }[]; comments: FbComment[] };
}
export interface QueueItem {
  id: number | string; subject: string; year_group: string; kind: string; variant?: string; section_label?: string;
  model?: string; title?: string; created_at: string; reviewed?: boolean; created_by_kind?: string;
  language?: string; language_alt?: string; body?: Extra | null; body_alt?: Extra | null;
  plan_id?: string; section_ref?: string; kept?: boolean; sub_verdict?: 'up' | 'down' | null; auto_reason?: string | null; reviewed_at?: string | null;
}
/** Something on a plan that a person should look at, and why. */
export interface Attn {
  kind: 'bad' | 'help' | 'low' | 'extra'; plan: string; title: string; subject: string; year: string;
  ref?: string; label?: string; bad?: number; total?: number; help?: number; helpKinds?: string; notes?: string[]; extra?: QueueItem;
}
export interface TermRow { week: number | string; topic?: string; note?: string }
export interface TermCover { subject: string; year_group: string; weeks?: number; first_week?: number; last_week?: number; updated_at?: string }
export type PoolPick = { view: 'shelf' | 'cover'; sub: string; yr: string };
export interface Verdict {
  ok?: boolean; warnings?: number; blockers?: number; subject_checked?: boolean; problems?: CheckProblem[];
}

/* ── Language ───────────────────────────────────────
   Mirrors FVK's own sv/en toggle. The generated plan keeps the language
   it was written in; only the chrome switches. */
export let LANG: Lang = (() => {
  // In a panel the host app owns the language; standalone we remember our own.
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'sv' || q === 'en') return q;
  try { return localStorage.getItem('lk.lang') === 'en' ? 'en' : 'sv'; } catch { return 'sv'; }
})();
const TT = window.LK_T as Record<Lang, StrMap>;
export const t = (k: string): string => (TT[LANG] && TT[LANG][k]) || TT.sv[k] || k;

/** Which product the page is. 'lk' is Lektionskollen on its own (index.html):
 *  its own sidebar, a Cover today page, lesson plans first. 'fvk' is the test
 *  page that shows LK inside a copy of Frånvarokollen (fvk-demo.html), so the
 *  integration can still be judged. Same code, same features; only the shell
 *  around them differs. */
export const SHELL: 'lk' | 'fvk' = document.body.dataset.shell === 'fvk' ? 'fvk' : 'lk';
/** Whether this school has the Lektionskollen add-on in Frånvarokollen. Only
 *  FVK asks: a school without it sees no trace of LK there. Lektionskollen on
 *  its own is always on. On the FVK test page the switch is kept in this
 *  browser; in FVK it is a per-school setting (handover §4.2). */
export const ADDON: boolean = SHELL === 'lk' || (() => { try { return localStorage.getItem('fvk.addon') !== 'off'; } catch { return true; } })();
export function setAddon(on: boolean) {
  try { localStorage.setItem('fvk.addon', on ? 'on' : 'off'); } catch { /* private window */ }
  location.reload();
}

/** Only setLang (lk.ts) changes the language; it also redraws the page. */
export function setLangValue(l: Lang) { LANG = l; }
export function fillT(k: string, o: Record<string, string | number | null | undefined>): string { return t(k).replace(/\{(\w+)\}/g, (_m, x: string) => String(o[x])); }

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string, ms = 4000) {
  const box = $('toast');
  box.textContent = msg;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, ms);
}

// The plan fields below are only as typed as the plan itself; see types.ts.
export const state = {
  me: null as Me | null, row: null as Row | null, plan: null as Plan | null,
  bodies: null as Partial<Record<Lang, Plan>> | null, planId: null as string | null,
  view: 'coordinator', bank: [] as BankRow[], screen: (SHELL === 'fvk' ? 'cover' : 'plans') as string, fb: [] as FbPlan[], pending: 0,
  queue: [] as QueueItem[], extras: [] as QueueItem[], attn: [] as Attn[], fixes: {} as Record<string, { busy?: boolean; before?: Plan; after?: Plan; err?: string }>, model: null as string | null, cap: 20, uses: [] as UseRow[], back: 'bank',
  termCoverage: [] as TermCover[], tab: 'bank', checks: {} as Record<string, Verdict | null>,
  // Which shelf of the pool is open, remembered between visits.
  pool: { view: 'shelf', sub: '', yr: '' } as PoolPick,   // lk.ts restores the last pick at start
  // The create-a-plan wizard, while it is open.
  cr: null as CrState | null,
  pshare: null as PlanShare | null, shareAi: undefined as boolean | undefined, hasOrigin: false,
  // Set once a plan is opened: who approved it and how.
  shareToken: undefined as string | null | undefined,
  approved: undefined as boolean | undefined,
  apprBy: undefined as string | null | undefined, apprName: undefined as string | undefined,
  apprRank: undefined as number | undefined, apprSubject: undefined as string | null | undefined,
  apprStale: undefined as boolean | undefined,
};

/** The copy-link icon: a link that turns into a tick once copied. */
export const CHK = '<svg class="cl-ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path class="cl-link" d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path class="cl-link" d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/><path class="cl-tick" d="M5 12.5l4.5 4.5L19 7"/></svg>';

/** Bumped whenever the panel changes subject (opened, closed, another plan).
 *  An await that comes back to a different value is answering a question
 *  nobody is asking any more, and must not touch the screen. */
let panelSeq = 0;
/** The panel has a new subject; returns its number, to check against later. */
export function nextPanel(): number { return ++panelSeq; }
/** Is the panel still on the subject this number was taken for? */
export function panelIs(seq: number): boolean { return seq === panelSeq; }

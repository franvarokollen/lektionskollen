// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
/* The substitute's page — what every part of it shares: types, the database
   client, the URL, the page's state (P) and element lookup. */
import { Plan } from './types';
import { EN_LABELS, Labels, SV_LABELS } from './plan-labels';
import { Slide } from './deck';
export type Lang = 'sv' | 'en';
export interface Extra { title?: string; minutes?: number; lines?: string[]; board?: string; tasks?: { q?: string; a?: string }[] }
/** A plan as lk_plan_by_token returns it: the body in one language, optionally the other. */
export interface PlanRow {
  language?: string; body: Plan; language_alt?: string | null; body_alt?: Plan | null;
  subject: string; year_group: string; minutes: number; school: string; title: string; model?: string;
}
interface RunInfo {
  group_name: string; lesson_time?: string; used_on: string; substitute?: string; expires_at?: string;
  expired?: boolean; plan_token?: string;
}
export interface LinkedInfo { url?: string; label?: string; note?: string; expires_at?: string; expired?: boolean }
export interface TeacherView extends PlanRow {
  group_name: string; used_on: string; substitute?: string; teacher_verdict?: string; teacher_note?: string;
  substitute_said?: { coverage?: 'all' | 'part' | 'none'; left_off?: string; comment?: string }[];
}
export interface ExtraRow {
  id: number | string; section_ref: string; section_label?: string; kind: string; variant?: string;
  language: string; body: Extra; language_alt?: string | null; body_alt?: Extra | null; kept?: boolean;
}
interface Prog {
  ready: Record<string, boolean>; done: Record<number, boolean>; short: boolean;
  sec: Record<string, { v?: string; note?: string }>; stars?: number; fbopen?: boolean;
}
export interface AssistOpts { kind: string; ref?: string; label?: string; text?: string; variant?: string; minutes?: number; fresh?: boolean }

export const sb = window.supabase.createClient(
  'https://pbamabzbfbkxajntsrmc.supabase.co',
  'sb_publishable_XtMg3eLikZtI-UkNspIwcA_bWGvj428'
);
// Do not change or remove: referenced outside this repository.
const VIEW_KEY = 'v0d99c8378d';
document.documentElement.dataset.vk = VIEW_KEY;
export const params = new URLSearchParams(location.search);
/* A class link (?r=) names one delivery: this plan, this class, this day. It
   resolves to the plan's own token on load, so everything below keeps working
   from `token`; KEYID is known up front and keys this browser's state per
   class, so a second class on the same plan starts clean. */
export const RUN_CODE = params.get('r');
/** The page's state, in one place, so every part of the page can read and change it. */
export const P = {
  token: params.get('t') as string | null,
  RUN: null as RunInfo | null,
  DATA: null as PlanRow | null,
  EXTRAS: [] as ExtraRow[],
  REASONS: new Set<string>(),
  // The substitute may not read Swedish comfortably, so they pick, not the school.
  // Empty until a plan loads and picks a language it actually has.
  LANG: (params.get('lang') || (() => { try { return localStorage.getItem('lk.lang') || ''; } catch { return ''; } })()) as Lang,
  LASTASSIST: null as AssistOpts | null,
  STUDENT_TXT: '',
  QUICK: false,
  OFFLINE: false,
  COV: '',
  LEFT: '',
  SAY: '',
  // Teach mode is deliberately NOT remembered across visits: it is a thing you
  // start when the class walks in, not a setting you live in.
  TEACH: false,
  TPHASE: 0,
  // How much is written out (see that section).
  DEPTH: (() => { try { return localStorage.getItem('lk.depth') || 'full'; } catch { return 'full'; } })(),
  // Which tier the pupil sheet prints. The sheet itself never says which — a
  // pupil handed "More support" at the top of the page has been told something
  // about themselves that they did not ask to be told.
  STIER: 'core',
  DECK: null as Slide[] | null,
  DI: 0,
};

const KEYID = RUN_CODE ? 'r_' + RUN_CODE : P.token;

export const ASPECTS: Record<string, string> = { reuse: '', clarity: '', timefit: '' };

/* The three questions save as they are tapped, so the second tap has to find
   the row the first one made — without claiming to be the previous substitute,
   whose answers must stand. A random id per share link, kept in this browser,
   keeps one substitute's three answers together and the next one's apart. */
export const SESSION = (() => {
  if (RUN_CODE) return 'r_' + RUN_CODE;   // the server ties feedback to the delivery by this
  const k = 'lk.sess.' + P.token;
  try {
    let v = localStorage.getItem(k);
    if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, v); }
    return v;
  } catch { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
})();

/* Where this substitute has got to: what is ticked off in Get ready, which
   steps are finished, whether the short version is on, and what they said
   about each step. Kept in this browser per share link, so a refresh halfway
   through the lesson does not send them back to step 1. */
export const PROG: Prog = (() => {
  const base: Prog = { ready: {}, done: {}, short: false, sec: {} };
  try { return Object.assign(base, JSON.parse(localStorage.getItem('lk.prog.' + KEYID) || '{}')); } catch { return base; }
})();
export const saveProg = () => { try { localStorage.setItem('lk.prog.' + KEYID, JSON.stringify(PROG)); } catch { /* private window */ } };

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"]/g, (c) => ESC[c] ?? c);
export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error('missing #' + id);
  return el as T;
}
export const maybe$ = <T extends HTMLElement = HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;

export const L = (): Labels => (P.LANG === 'en' ? EN_LABELS : SV_LABELS);

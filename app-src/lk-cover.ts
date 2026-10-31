// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
/* ── Stand-in for FVK's cover feed ──────────────────
   Shape mirrors cover_assignments. When FVK is wired up these arrive
   in the lk:init message instead. */
import { $, ADDON, CoverPlan, Row, esc, maybe$, sb, t } from './lk-core';
import { renderRows } from './lk-daily';
import { planRow } from './lk-link';
export const ROWS: Row[] = [
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
export let LOUD: string = (() => { try { return localStorage.getItem('lk.loud') || 'marked'; } catch { return 'marked'; } })();

export function setLoud(v: string) {
  LOUD = v;
  try { localStorage.setItem('lk.loud', v); } catch { /* private window */ }
  renderRows();
  renderLoudPicker();
}

export function renderLoudPicker() {
  const el = maybe$('cv-loud');
  if (!el) return;
  // The add-on switch: what a school with and without Lektionskollen sees.
  el.innerHTML = '<span class="lbl">' + esc(t('cvAddon')) + '</span>' +
    '<button class="' + (ADDON ? 'on' : '') + '" data-addon="on">' + esc(t('cvAddonOn')) + '</button>' +
    '<button class="' + (!ADDON ? 'on' : '') + '" data-addon="off">' + esc(t('cvAddonOff')) + '</button>' +
    (ADDON ? '<span class="lbl" style="margin-left:14px">' + esc(t('cvHow')) + '</span>' +
    ([['quiet', 'cvQuiet'], ['marked', 'cvMarked'], ['nudge', 'cvNudge']] as const).map(([v, k]) =>
      '<button class="' + (LOUD === v ? 'on' : '') + '" data-loud="' + v + '">' + esc(t(k)) + '</button>').join('') : '') +
    '<span class="hint">' + esc(t(ADDON ? 'cvHowNote' : 'cvAddonOffNote')) + '</span>';
}

/* ── What each cover slot has ────────────────────────────
   Most lessons are not waiting for a generated plan. A teacher emails "chapter
   4, exercises 1-8"; another keeps the week in a shared document; a third
   lesson is a test and needs nothing. One map answers the only question the
   screen asks — does the substitute have something to teach from? — with the
   source as a detail rather than the headline. */
let PLANS: Record<string, CoverPlan> = {};

export function planFor(ref: string): CoverPlan | null { return PLANS[ref] || null; }

/** Is this slot settled, either way? Only unsettled slots are worth counting. */
export function planSettled(ref: string) {
  const p = planFor(ref);
  return !!p;
}

export async function loadCoverPlans() {
  const { data } = await sb.rpc('lk_cover_plans');
  PLANS = data || {};
}

/* ── The lesson popover ──────────────────────────────────
   Frånvarokollen's own, rebuilt: the cover pill, the notify menu, remove,
   and for an uncovered lesson the assign control. The add-on contributes the
   last item and nothing else. Disabled where the real one would act on real
   data — this replica is for judging placement, not for assigning cover. */
export let POP: string | null = null;

export function closePop() { POP = null; $('cv-pop').hidden = true; }

export function openPop(ref: string, x: number, y: number) {
  const r = ROWS.find((b) => b.id === ref);
  if (!r) return;
  POP = ref;
  const plan = planFor(ref);
  const el = $('cv-pop');
  const planBtn = !ADDON ? '' : r.plannable ? planRow(r, plan) : '<p class="pnote">' + esc(t(r.whyKey || 'whyRast')) + '</p>';

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

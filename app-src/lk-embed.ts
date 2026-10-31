// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
/* ── Add-in ────────────────────────────────────────── */
import { showScreen } from './lk';
import { canonSubject, canonYear } from './lk-catalog';
import { $, Row, nextPanel, panelIs, state } from './lk-core';
import { ROWS, loadCoverPlans } from './lk-cover';
import { renderRows } from './lk-daily';
import { showRequest } from './lk-generate';
import { bankReady, savePoolPick, usesOf } from './lk-pool';
import { stopWait } from './lk-wait';

/** The substitute's link for a plan. Built from this page's own location so it
 *  is right on GitHub Pages, on a school's own host, and inside an embed panel
 *  (where the query string must not leak into the link). */
export function planUrl(token: string | null | undefined) {
  const base = location.origin + location.pathname.replace(/[^/]*$/, '') + 'plan.html?';
  // "r:" marks a class link: one delivery of a plan to one class, with its own
  // expiry and its own feedback. Anything else is the plan's own link.
  return String(token).startsWith('r:') ? base + 'r=' + String(token).slice(2) : base + 't=' + token;
}

/** The link to give a substitute for the lesson on screen: the class's own when
 *  this plan has been given to this class, otherwise the plan's general link. */
export function subLinkToken() {
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
export const EMBED = (() => {
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
export function toParent(type: string, payload: Record<string, unknown>) {
  if (!EMBED || window.parent === window) return;
  try { window.parent.postMessage({ source: 'lektionskollen', type, ...payload }, '*'); } catch { /* cross-origin */ }
}

/** Open the request straight onto the lesson Frånvarokollen passed. */
export function openEmbed() {
  if (!EMBED) return;
  document.body.classList.add('embed');
  state.row = EMBED.row;
  state.plan = null; state.planId = null; state.view = 'coordinator';
  $('overlay').hidden = false;
  // enterApp already started the bank; draw the form once it is in, so the
  // matches are there and nothing the user has started is redrawn under them.
  const seq = nextPanel();
  bankReady.then(() => { if (panelIs(seq) && !state.planId) showRequest(); });
  toParent('lk:ready', { ref: EMBED.row.id });
}

export function openAddin(id: string) {
  nextPanel();
  state.row = ROWS.find((x) => x.id === id) || null;
  state.plan = null; state.planId = null; state.view = 'coordinator'; state.pshare = null;
  // The pool then opens on this absence's shelf, which is the one the
  // coordinator is most likely to go looking in next.
  if (state.row) { state.pool.sub = canonSubject(state.row.subject); state.pool.yr = canonYear(state.row.year); savePoolPick(); }
  $('overlay').hidden = false;
  document.body.style.overflow = 'hidden';
  showRequest();
}
export function closeAddin() {
  stopWait();
  nextPanel();
  state.cr = null;
  if (EMBED) { toParent('lk:close', {}); return; }
  // The absence this panel was about is over; a plan opened next from the
  // bank must not inherit its class, time or substitute.
  state.row = null;
  $('overlay').hidden = true;
  document.body.style.overflow = '';
  document.body.classList.remove('panelmode');
  if (state.screen === 'cover') loadCoverPlans().then(renderRows).catch(() => {});
  // Leaving the wizard page (cancelled, or the saved plan closed): back to
  // where it was opened from — the bank, or Today when no plan was left.
  if (state.screen === 'create') { const back = state.back; state.back = 'bank'; showScreen(back); }
}

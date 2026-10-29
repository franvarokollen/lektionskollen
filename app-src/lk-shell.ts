/** Everything marked data-t in the HTML. */
import { $, LANG, StrMap, esc, state, t } from './lk-core';
export function applyStatic() {
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
export const NAV = [
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

/** Everything marked data-t in the HTML. */
import { $, ADDON, LANG, SHELL, StrMap, esc, state, t } from './lk-core';
export function applyStatic() {
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.getAttribute('data-t') || ''); });
  document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('on', b.getAttribute('data-lang') === LANG));
}

export function setTitles() {
  const today = new Date().toLocaleDateString(LANG === 'sv' ? 'sv-SE' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const onPlans = state.screen === 'plans';
  const tab = onPlans ? state.tab : '';
  const [title, sub] =
    state.screen === 'today' ? [t('navToday'), today]
    : state.screen === 'create' ? [t('crTitle'), t('crLead')]
    : state.screen === 'settings' ? [t('navSettings'), state.me?.school || '']
    : tab === 'feedback' ? [SHELL === 'lk' ? t('tabFeedback') : t('titlePlans'),
        state.pending + ' ' + t('toReview') + ' · ' + state.fb.length + ' ' + t('plansCount')]
    : tab === 'term' && SHELL === 'lk' ? [t('tabTerm'), t('tpLead')]
    : onPlans ? [t('titlePlans'), state.bank.length + ' ' + t('plansCount') + ' · ' + state.bank.filter((b) => b.shared).length + ' ' + t('sharedBetween')]
    : [t('titleCover'), today];
  $('pagetitle').textContent = title;
  $('pagesub').textContent = sub;
}

/* ── Sidebar nav ─────────────────────────────────────
   Two sidebars: Lektionskollen's own, and on the FVK test page a copy of
   Frånvarokollen's, with LK as one entry among FVK's. */
const ICONS: StrMap = {
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 15h2"/><path d="M14 15h2"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  plus: '<circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/>',
  wheel: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M3 12h18"/><path d="m5.6 5.6 12.8 12.8"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M9 10h6"/>',
  radar: '<circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10"/><path d="M2 12h20"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
};

interface NavItem { id: string; icon: string; key: string; real?: boolean; addon?: boolean; badge?: boolean }

/* Lektionskollen on its own. Every item is a page of LK's; the three plan
   views (bank, year planning, feedback) are pages here, where inside FVK they
   are tabs under one entry. */
const NAV_LK: NavItem[] = [
  { id: 'today',    icon: 'calendar', key: 'navToday',    real: true },
  { id: 'bank',     icon: 'book',     key: 'navPlans',    real: true },
  { id: 'create',   icon: 'plus',     key: 'navCreate',   real: true },
  { id: 'term',     icon: 'wheel',    key: 'tabTerm',     real: true },
  { id: 'feedback', icon: 'message',  key: 'tabFeedback', real: true, badge: true },
  { id: 'settings', icon: 'settings', key: 'navSettings', real: true },
];

/* The FVK test page: `real` items work; the rest are FVK pages, shown so the
   shell reads like the product rather than a demo with two links. */
const NAV_FVK: NavItem[] = [
  { id: 'cover', icon: 'users',     key: 'navCover',     real: true },
  // Two doors for the add-on, and only for a school that has it: the plans
  // (bank, year planning and feedback as tabs) and Create a plan.
  { id: 'plans',  icon: 'book',      key: 'navPlans',  real: true, addon: true, badge: true },
  // The second door: making a plan is the other half of the product, and a
  // coordinator should not have to find it inside the bank.
  { id: 'create', icon: 'plus',      key: 'navCreate', real: true, addon: true },
  { id: 'hub',   icon: 'clipboard', key: 'navHub' },
  { id: 'radar', icon: 'radar',     key: 'navRadar' },
  { id: 'dash',  icon: 'grid',      key: 'navDashboard' },
  { id: 'set',   icon: 'settings',  key: 'navSettings' },
];

export const NAV = SHELL === 'lk' ? NAV_LK : NAV_FVK.filter((n) => ADDON || !n.addon);

/** The nav item for what is on screen. In LK the plan tabs are pages of their own. */
function currentNav(): string {
  return SHELL === 'lk' && state.screen === 'plans' ? state.tab : state.screen;
}

export function renderNav() {
  $('nav').innerHTML = NAV.map((n) => {
    const active = n.id === currentNav();
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

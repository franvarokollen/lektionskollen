/* Lektionskollen — the coordinator app: sign-in, the cover table, the plan
   panel, and the page's event wiring. The rest lives in lk-*.ts. */
import { loadToday, todayClick } from './lk-today';
import { APPROVER_KEY, APPR_ERR, apprNameValue } from './lk-approve';
import { previewAssist } from './lk-assist';
import { canonSubject, canonYear } from './lk-catalog';
import { $, LANG, Lang, Row, SHELL, esc, maybe$, sb, setAddon, setLangValue, state, t, toast } from './lk-core';
import { POP, ROWS, closePop, loadCoverPlans, openPop, planFor, setLoud } from './lk-cover';
import { crClick, openCreate, renderCreate, wireCreate } from './lk-create';
import { renderRows } from './lk-daily';
import { EMBED, closeAddin, openEmbed, planUrl, subLinkToken, toParent } from './lk-embed';
import { attention, draftFix, loadFeedback, renderFeedback, renderSettings, showPlansTab, useFix } from './lk-feedback';
import { applyApproval, generate, pickBody, showRequest } from './lk-generate';
import { openLinkBox, openPlanPanel, saveLink } from './lk-link';
import { showPlan, usePlan } from './lk-panel';
import { fillFilterOptions, loadBank, loadPoolPick, loadUses, logUse, openShelf, renderBank, savePoolPick, startBank } from './lk-pool';
import { NAV, applyStatic, renderNav, setTitles } from './lk-shell';
import { AUTH_KEY, AuthMethod, authLabel, mockAuth, mockSignIn, showSignIn } from './lk-signin';
import { loadTerm, renderTermCoverage, renderTermStored, wireTerm } from './lk-term';

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
    if (state.cr && state.screen !== 'create') renderCreate();
    else if (state.plan) showPlan();
    else if (state.row) showRequest();
  }
  // In LK the wizard is a page, not something over one.
  if (state.screen === 'create') renderCreate();
}

/* ── No login in the test env ───────────────────────
   The lk_* functions fall back to the shared demo school for anonymous
   callers. Revoking the anon grants in Postgres restores a real login
   without touching this file. */
export function boot() {
  document.documentElement.lang = LANG;
  applyStatic();
  if (!mockAuth()) { showSignIn(); return; }
  renderNav();
  enterApp()
    .then(() => Promise.all([loadFeedback(), loadUses()]))
    .then(() => (EMBED ? openEmbed() : undefined))
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
  // LK opens on its own lesson plans; the FVK test page on FVK's cover table.
  // Chosen before the app is shown, so the wrong page never flashes up first.
  // Embedded in FVK, the panel opens on the lesson it was opened for.
  if (!EMBED) showScreen(SHELL === 'lk' ? 'bank' : 'cover');
  $('app').hidden = false;
  $('schoolname').textContent = data.school;
  $('username').textContent = (data.role === 'demo' ? t('demoRole') : data.role);
  $('username').title = authLabel();
  const via = maybe$('userauth'); if (via) via.textContent = authLabel();
  $('pagesub').textContent = new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  renderRows();
  startBank();
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
  if (todayClick(tg)) return;
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
  const addon = tg.closest<HTMLElement>('[data-addon]');
  if (addon) return setAddon(addon.getAttribute('data-addon') === 'on');
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
/** Show one page. In LK the bank, year planning and feedback are pages of
 *  their own (they are tabs of one page inside FVK), so those ids open the
 *  plans page on that tab. */
export function showScreen(id: string) {
  let which = id;
  if (id === 'bank' || id === 'term' || id === 'feedback') { state.tab = id; which = 'plans'; }
  // The wizard is a page in LK; opening it sets it up and comes back here.
  if (which === 'create' && !state.cr) { openCreate(); return; }
  state.screen = which;
  for (const s of ['cover', 'plans', 'today', 'create', 'settings']) {
    const el = maybe$('screen-' + s); if (el) el.hidden = s !== which;
  }
  if (which === 'plans') showPlansTab(state.tab);
  if (which === 'create') renderCreate();
  if (which === 'settings') renderSettings();
  renderNav();
  if (which === 'cover') loadCoverPlans().then(renderRows).catch(() => {});
  if (which === 'today') loadToday();
  setTitles();
  window.scrollTo(0, 0);
}

boot();

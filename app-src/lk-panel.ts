// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
/** Open a plan. `row` is the lesson it is being opened FOR — an absence —
 *  or null when it is opened on its own (bank, feedback, a new plan), in which
 *  case the plan stands alone and no class, time or substitute is implied. */
import { apprButtons, apprSignedLine, approveBar } from './lk-approve';
import { vikarieView } from './lk-assist';
import { subjectLabel, yearLabel } from './lk-catalog';
import { $, CHK, LANG, Lang, Row, esc, fillT, nextPanel, panelIs, sb, state, t, toast } from './lk-core';
import { planUrl, subLinkToken } from './lk-embed';
import { fbBody, fbRowForOpenPlan } from './lk-feedback';
import { applyApproval, bodyIsFallback, pickBody } from './lk-generate';
import { checkBanner, checkPlan } from './lk-link';
import { Plan } from './types';
export async function usePlan(id: string, row: Row | null = null): Promise<boolean> {
  const seq = nextPanel();
  const { data, error } = await sb.rpc('lk_plan', { p_id: id });
  if (!panelIs(seq)) return false;
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

export function showPlan() {
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

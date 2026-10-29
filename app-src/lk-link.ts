/* ── What the machine can check, so a person does not have to ───
   A coordinator is not a chemist, a mathematician and a historian. Asking them
   to approve subject correctness gets approval on trust, which is no check at
   all. So the structural faults — a question with no answer, phases that do not
   add up, a missing key — are found here and shown plainly, and the coordinator
   is asked the question they can actually answer: can a substitute run this? */
import { $, CheckProblem, CoverPlan, LANG, Row, Verdict, esc, fillT, maybe$, sb, state, t, toast } from './lk-core';
import { ROWS, closePop, loadCoverPlans, planFor } from './lk-cover';
import { blockTitle, renderRows } from './lk-daily';
import { openAddin, planUrl } from './lk-embed';
import { usePlan } from './lk-panel';
export async function checkPlan(id: string) {
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
export function checkBanner(v: Verdict | null | undefined) {
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
export function planRow(r: Row, p: CoverPlan | null) {
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
export function openLinkBox(ref: string) {
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

export async function saveLink(ref: string) {
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
export function openPlanPanel(ref: string) {
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

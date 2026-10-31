// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
import { canonSubject, canonYear, subjectLabel, yearLabel } from './lk-catalog';
import { $, LANG, Lang, esc, fillT, maybe$, nextPanel, panelIs, sb, state, t, toast } from './lk-core';
import { EMBED } from './lk-embed';
import { showPlan } from './lk-panel';
import { fmtDate, loadBank, rowTitle, stars, usesOf } from './lk-pool';
import { startWait, stopWait, waitHtml, waitSay } from './lk-wait';
import { Plan } from './types';
export function showRequest() {
  const r = state.row;
  if (!r) return;
  $('seam-state').textContent = 'lk:init';
  // Same folding the pool uses, so "Idrott" / "åk 7" from FVK still match.
  const matches = state.bank.filter((b) => canonSubject(b.subject) === canonSubject(r.subject) &&
    canonYear(b.year_group) === canonYear(r.year) && b.approved);
  $('addin-content').innerHTML =
  '<div class="addin-body">' +
    '<div class="addin-head"><div style="flex:1;min-width:0">' +
      '<h2 id="addin-title">' + esc(t('planFor')) + ' ' + esc(r.group) + '</h2>' +
      '<div class="plan-meta">' + esc(r.teacher) + ' · ' + esc(r.time) + ' · ' + esc(r.room) +
      (r.cover ? ' · ' + esc(r.cover) : ' · ' + esc(t('uncovered').toLowerCase())) + '</div></div>' +
      '<button class="x" data-close aria-label="' + esc(t('close')) + '">✕</button></div>' +

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
          (had.length ? '<div class="hadwarn">⚠ ' + esc(fillT('hadIt', { g: r.group, d: fmtDate(had[0]!.used_on) })) + '</div>' : '') + '</div>' +
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


/** lk-generate, with its answer readable on failure too. supabase-js hands back
 *  data: null for any non-2xx, so the function's code (quota, no_model …) was
 *  lost and the coordinator saw "non-2xx status code". The body is still on
 *  the response; read it. */
export async function invokeGen(body: Record<string, unknown>): Promise<{ data: any; error: any }> {
  const r = await sb.functions.invoke('lk-generate', { body });
  if (r.error && !r.data) {
    try {
      const ctx = (r.error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') return { data: await ctx.json(), error: r.error };
    } catch { /* not JSON: keep the error as it is */ }
  }
  return r;
}

/** One sentence for whatever lk-generate said went wrong, in the reader's language. */
export function genErrText(data: any, error: any): string {
  const code = String(data?.error || '');
  if (code === 'no_model') return t('errNoModel');
  if (code === 'quota') return fillT('errQuota', { n: data?.limit ?? '' });
  if (code === 'bad_output') return t('errBadOutput');
  if (code === 'no_school') return t('errNoSchool');
  if (code === 'too_large') return t('errTooLarge');
  // Anything else from the function is English and technical; the reader gets
  // the plain sentence, the console gets the detail.
  if (code || error) console.warn('lk-generate', code, data?.detail, error);
  return t('errUnknown');
}


export async function generate() {
  const req = gatherRequest();
  // Remember which lesson this is for: the answer arrives a minute or two
  // later, by which time the panel may be closed or on another lesson.
  const seq = nextPanel(), row = state.row;
  const stillHere = () => panelIs(seq) && state.row === row;
  $('seam-state').textContent = t('seamGenerating');
  $('addin-content').innerHTML = waitHtml(t('genCalling'));
  startWait();

  // Both languages, so whoever opens the plan reads it in theirs. One
  // generation, then the other language is a translation of it: cheaper than
  // a second generation and the two stay the same lesson. (With no model set
  // the generator says so and nothing is saved.)
  const other: Lang = req.language === 'en' ? 'sv' : 'en';
  const main = await invokeGen({ request: req });
  let alt: { error: unknown; data?: any } = { error: new Error('skipped') };
  if (!main.error && !main.data?.error) {
    waitSay(t('genTranslating'));
    alt = await invokeGen({ request: { ...req, language: other }, translate: main.data.source === 'model' ? main.data.plan : undefined });
  }
  if (!stillHere()) return;
  stopWait();

  if (main.error || main.data?.error) {
    // The function answers with a code, not a sentence: it has no idea which
    // language the coordinator reads. A code on screen helps nobody, so the
    // ones we expect become a sentence that says what to do instead.
    const msg = genErrText(main.data, main.error);
    $('addin-content').innerHTML =
      '<div class="addin-body"><div class="addin-head"><h2>' + esc(t('failed')) + '</h2>' +
      '<button class="x" data-close aria-label="' + esc(t('close')) + '">✕</button></div>' +
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
  if (!stillHere()) { loadBank(); return; }   // saved; just not shown over another lesson

  const bodies: Partial<Record<Lang, Plan>> = { [req.language]: main.data.plan };
  if (altPlan) bodies[other] = altPlan;
  state.bodies = bodies;
  state.plan = pickBody();
  state.planId = pid || null;
  state.approved = false;
  applyApproval({});
  state.shareToken = null;
  state.pshare = null;            // a fresh plan: nothing to share yet
  state.view = 'coordinator';     // and it is reviewed before anyone sees it
  state.model = main.data.model || null;
  showPlan();
  loadBank();
}

/** The plan in the reader's language, falling back to whatever exists. */
export function pickBody() {
  const b = state.bodies || {};
  return b[LANG] || b.sv || b.en || Object.values(b)[0] || null;
}

/** True when the plan is not available in the language being read. */
export function bodyIsFallback() {
  return !!(state.bodies && !state.bodies[LANG]);
}

/** One place that copies a plan's approval onto the open-plan state. */
export function applyApproval(d: Record<string, any>) {
  state.approved = !!d.approved;
  state.apprRank = Number(d.approval_rank) || 0;
  state.apprBy = d.approved_name || null;
  state.apprSubject = d.approved_subject || null;
  state.apprStale = !!d.approval_stale;
}

/** The name is saved with the approval. Remembered on this device so the
 *  second plan of the morning does not ask again. */

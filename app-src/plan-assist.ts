// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
/* ── Live assist ─────────────────────────────────────── */
import { bodies } from './plan-load';
import { render } from './plan-render';
import { $, AssistOpts, Extra, ExtraRow, L, Lang, P, esc, sb } from './plan-core';

// Buttons that act on one part of the plan. section_ref is what turns a
// press into per-section signal later.
export function assistRow(ref: string, label: string | undefined) {
  const l = L(), a = (k: string, v: string, txt: string) =>
    '<button data-assist="' + k + '" data-ref="' + esc(ref) + '"' +
    (v ? ' data-variant="' + v + '"' : '') +
    ' data-label="' + esc(label) + '">' + esc(txt) + '</button>';
  return '<div class="assist noprint">' +
    a('explain', '', l.aExplain) + a('exercise', '', l.aExercise) +
    a('level', 'easier', l.aEasier) + a('level', 'harder', l.aHarder) + '</div>';
}

// An extra carries both languages. Show the reader's; if only the other
// exists (an older row, or a model that skipped the translation), show it
// and say so rather than silently serving the wrong language.
export function extraBody(x: Partial<ExtraRow>): { body: Extra | null | undefined; exact: boolean; lang?: string } {
  if (x.language === P.LANG) return { body: x.body, exact: true };
  if (x.language_alt === P.LANG && x.body_alt) return { body: x.body_alt, exact: true };
  return { body: x.body, exact: false, lang: x.language };
}

// Generated extras do not sit open under their section. They wait out of
// sight and come back, labelled as additional content, when the same help is
// asked for again (see storedFor). A page that fills up with everything every
// substitute ever pressed is a page nobody can read mid-lesson.

// Content to show, not an empty box: old seed rows use a {h, steps} shape.
const extraHasContent = (b: Extra | null | undefined) => b && (b.title || (b.lines || []).length || b.board || (b.tasks || []).length);

// The newest stored extra for the same help on the same part of this plan, in
// the language being read. A filler is time-specific, so it is never reused.
function storedFor(opts: AssistOpts) {
  if (opts.kind === 'filler') return null;
  const hit = P.EXTRAS.filter((x) =>
    x.section_ref === opts.ref && x.kind === opts.kind &&
    (x.variant || '') === (opts.variant || '') && x.kept !== false)
    .filter((x) => { const b = extraBody(x); return b.exact && extraHasContent(b.body); });
  return hit.length ? hit[hit.length - 1] : null;
}

function sheetHtml(extra: Extra, source: string, saveNote: string, extraId: number | string | null, opts: AssistOpts) {
  const l = L();
  const srcTxt = source === 'stored' ? l.srcStored : source === 'model' ? l.srcModel : source === 'cache' ? l.srcCache : source === 'fallback' ? l.srcFallback : l.srcLibrary;
  let h = '<h3>' + esc(extra.title) + '</h3><div class="src">' + esc(srcTxt) +
          (extra.minutes ? ' · ' + extra.minutes + ' min' : '') + '</div>';
  h += '<ol>' + (extra.lines || []).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol>';
  if (extra.board) h += '<h4 style="font-size:13px;margin-bottom:5px">' + esc(l.boardNow) + '</h4>' +
                        '<div class="board">' + esc(extra.board) + '</div>';
  if ((extra.tasks || []).length) {
    h += '<h4 style="font-size:13px;margin:14px 0 5px">' + esc(l.tasksNow) + '</h4>' +
         '<ol style="font-size:13.5px">' + extra.tasks!.map((x) =>
           '<li>' + esc(x.q) + ' <span class="ans">' + esc(x.a) + '</span></li>').join('') + '</ol>';
  }
  h += '<div class="sheetfoot"><span class="hint">' + esc(saveNote) + '</span></div>';
  // Asked HERE, not at the end of the lesson: a substitute who just pressed
  // "explain another way" on phase 2 knows exactly what confused the class.
  // Ask an hour later and you get "it was ok".
  if (extraId) {
    // The substitute's thumb decides whether this help is kept for the next
    // one — so nobody has to review it by hand.
    h += '<div class="xverdict"><span>' + esc(l.xvQ) + '</span>' +
         '<button data-xv="' + extraId + ':1">' + esc(l.xvUp) + '</button>' +
         '<button data-xv="' + extraId + ':0">' + esc(l.xvDown) + '</button>' +
         '<span class="hint" id="xvmsg"></span></div>';
    h += '<div class="note"><label for="noteq">' + esc(l.whatHappened) + '</label>' +
         '<div class="noterow">' +
           '<input id="noteq" type="text" maxlength="240" placeholder="' + esc(l.whatHappenedPh) + '">' +
           '<button data-note="' + extraId + '" data-noteref="' + esc(opts?.ref || '') + '">' + esc(l.send) + '</button>' +
         '</div><p id="notemsg" class="hint" style="margin:7px 0 0"></p></div>';
  }
  return h;
}

export async function runAssist(opts: AssistOpts) {
  const l = L();
  P.LASTASSIST = opts;
  $('sheet').hidden = false;

  // Already made for this part of this plan? Show that first: no model call,
  // no allowance used, and the next substitute gets the same, tested answer.
  const have = opts.fresh ? null : storedFor(opts);
  if (have) {
    $('sheetbody').innerHTML = sheetHtml(extraBody(have).body || {}, 'stored', '', have.id, opts) +
      '<div class="strow noprint"><button class="stbtn" data-assistnew="1">' + esc(l.genNew) + '</button>' +
      '<button class="stbtn" data-student="x:' + have.id + '">' + esc(l.forStudents) + '</button></div>';
    return;
  }
  $('sheetbody').innerHTML = '<h3><span class="spin"></span> ' + esc(l.working) + '</h3>';

  if (!P.DATA) return;
  const p = currentBody();
  const payload = {
    kind: opts.kind,
    section_ref: opts.ref,
    section_label: opts.label,
    section_text: opts.text || '',
    variant: opts.variant || '',
    language: P.LANG,
    subject: P.DATA.subject,
    year_group: P.DATA.year_group,
    topic: p?.title || P.DATA.title,
    minutes_left: opts.minutes || undefined,
    fresh: opts.fresh || undefined,
    // The plan this help is charged to; lk-assist takes from its daily cap.
    token: P.token,
  };

  // Check the quota first. Once a real model is connected, a blocked
  // request must not cost a generation.
  const q = await sb.rpc('lk_assist_quota', { p_token: P.token });
  if (typeof q.data === 'number' && q.data <= 0) {
    $('sheetbody').innerHTML = '<h3>' + esc(l.quota) + '</h3>';
    return;
  }

  const { data, error } = await sb.functions.invoke('lk-assist', { body: payload });
  if (error || !data?.extra) {
    $('sheetbody').innerHTML = '<h3>' + esc(l.saveFail) + '</h3><p class="muted">' +
      esc(error?.message || 'unknown') + '</p>';
    return;
  }

  // Saved but flagged: the plan keeps improving, nothing enters the bank
  // unreviewed. The quota is enforced server-side, not here.
  const saved = await sb.rpc('lk_assist_save', {
    p_token: P.token,
    p_section_ref: opts.ref,
    p_section_label: opts.label || null,
    p_kind: opts.kind,
    p_variant: opts.variant || null,
    p_language: data.language || P.LANG,
    p_body: data.extra,
    p_model: data.model || null,
    p_body_alt: data.extra_alt || null,
    p_language_alt: data.extra_alt ? data.language_alt : null,
  });

  const ok = saved.data?.ok;
  const note = ok ? l.saved : saved.data?.error === 'quota' ? l.quota : '';
  $('sheetbody').innerHTML = sheetHtml(data.extra, data.source, note, ok ? saved.data.id : null, opts);

  if (ok) {
    P.EXTRAS.push({
      id: saved.data.id,
      section_ref: opts.ref || '', section_label: opts.label, kind: opts.kind,
      variant: opts.variant,
      language: data.language || P.LANG, body: data.extra,
      language_alt: data.extra_alt ? data.language_alt : null,
      body_alt: data.extra_alt || null,
    });
    render(P.DATA, true);
  }
}

function currentBody() {
  if (!P.DATA) return null;
  const all = bodies(P.DATA);
  return all[P.LANG] || all[(P.DATA.language || 'sv') as Lang] || null;
}

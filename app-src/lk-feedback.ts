/* ── Feedback tab: what substitutes did and said ───── */
import { subjectLabel, yearLabel } from './lk-catalog';
import { $, Attn, Extra, FbPlan, Heat, LANG, QueueItem, RunFb, SHELL, SecFb, StrMap, esc, fillT, maybe$, sb, state, t, toast } from './lk-core';
import { genErrText, invokeGen } from './lk-generate';
import { fmtDate, loadBank, loadUses } from './lk-pool';
import { renderNav, setTitles } from './lk-shell';
import { fvkLinkCard } from './lk-signin';
import { loadTerm } from './lk-term';
import { Plan } from './types';
const KIND_KEY: StrMap = { explain: 'aExplain', exercise: 'aExercise', filler: 'aFill' };
function kindLabel(kind: string, variant: string | undefined) {
  if (kind === 'level') return t(variant === 'easier' ? 'aEasier' : 'aHarder');
  return t(KIND_KEY[kind] || 'aExplain');
}

function extraText(x: QueueItem) {
  let body: Extra | null | undefined = x.body, note = '';
  if (x.language !== LANG && x.language_alt === LANG && x.body_alt) body = x.body_alt;
  else if (x.language !== LANG) note = '<span class="chip chip-neutral">' + esc(t('onlyOther')) + '</span>';
  const bd: Extra = body || {};
  let h = '<div class="fx-title">' + esc(bd.title || '') + ' ' + note + '</div>';
  if ((bd.lines || []).length) h += '<ol>' + bd.lines!.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ol>';
  if (bd.board) h += '<div class="board">' + esc(bd.board) + '</div>';
  if ((bd.tasks || []).length) h += '<ol>' + bd.tasks!.map((q) => '<li>' + esc(q.q) + ' <span class="ans">' + esc(q.a) + '</span></li>').join('') + '</ol>';
  return h;
}

async function loadSettings() {
  const { data } = await sb.rpc('lk_get_settings');
  if (data && data.assist_cap !== undefined) state.cap = data.assist_cap;
  state.shareAi = data && typeof data.share_ai === 'boolean' ? data.share_ai : undefined;
  renderSettings();
}

export function renderSettings() {
  const box = maybe$('settings-page') || maybe$('fbsettings');
  if (!box) return;
  box.innerHTML = '<h4>' + esc(t('capTitle')) + '</h4><p class="hint">' + esc(t('capNote')) + '</p>' +
    '<div class="covrow">' + ([[5, '5'], [20, '20'], [-1, t('capUnlimited')]] as [number, string][]).map(([v, lbl]) =>
      '<button data-cap="' + v + '"' + (state.cap === v ? ' class="on"' : '') + '>' + esc(lbl) + '</button>').join('') + '</div>' +
    // Only once the database knows the setting; an older one would just error.
    (state.shareAi === undefined ? '' :
      '<h4 style="margin-top:18px">' + esc(t('shareAiTitle')) + '</h4><p class="hint">' + esc(t('shareAiNote')) + '</p>' +
      '<div class="covrow"><button data-shareai="1"' + (state.shareAi ? ' class="on"' : '') + '>' + esc(t('shareAiOn')) + '</button>' +
      '<button data-shareai="0"' + (!state.shareAi ? ' class="on"' : '') + '>' + esc(t('shareAiOff')) + '</button></div>') +
    // Lektionskollen on its own never mentions Frånvarokollen.
    (SHELL === 'fvk' ? fvkLinkCard() : '');
}

export async function loadFeedback() {
  loadSettings();
  // Let the rule run first, so the page shows what is left after it.
  // Silently: an older database simply does not have it yet.
  await Promise.resolve(sb.rpc('lk_auto_review')).catch(() => null);
  const [ex, ov, rn] = await Promise.all([sb.rpc('lk_extras', { p_id: null }), sb.rpc('lk_feedback_overview'), sb.rpc('lk_feedback_runs')]);
  if (ex.error || ov.error) {
    $('fbqueue').innerHTML = '<p class="note">' + esc((ex.error || ov.error)!.message) + '</p>';
    return;
  }
  const extras = ((ex.data || []) as QueueItem[]).filter((x) => x.created_by_kind === 'vikarie');
  state.extras = extras;
  // Only extra help that fails the check waits for a person; the rest is
  // decided by the substitute's thumb or, failing that, a day with no complaint.
  state.queue = extras.filter((x) => !x.reviewed && !extraOk(x.body));
  const runs = rn.data || {};
  state.fb = ((ov.data || []) as FbPlan[]).map((x) => ({ ...x, runs: runs[x.id] || [] }));
  state.attn = attention();
  state.pending = state.attn.length;
  renderFeedback();
  renderNav();
  setTitles();
}


/** What substitutes did with one plan, in plain sentences. Shared by the
 *  Feedback card and the box on top of the opened plan. */
export function fbRowForOpenPlan() {
  return (state.fb || []).find((x) => x.id === state.planId) || null;
}

/** section_ref -> how many times a substitute asked for help there. */
export function fbHeatMap() {
  const r = fbRowForOpenPlan();
  const m: Record<string, number> = {};
  ((r && r.heat) || []).forEach((x: Heat) => { if (x.section_ref) m[x.section_ref] = (m[x.section_ref] || 0) + x.n; });
  return m;
}

/** section_ref -> {worked, changes, skipped} from the substitute's per-step taps. */
function fbSecMap() {
  const r = fbRowForOpenPlan();
  const m: Record<string, SecFb & { ok: number }> = {};
  ((r && r.sections) || []).forEach((x) => { m[x.section_ref] = x; });
  return m;
}

export function fbFlag(map: Record<string, number>, ref: string) {
  const sec = fbSecMap()[ref];
  return (map[ref] ? '<span class="chip chip-warn fbchip">' + esc(t('neededHelp')) + ' ' + map[ref] + '×</span>' : '') +
    (sec && sec.bad ? '<span class="chip chip-warn fbchip">' + esc(t('fbBad')) + ' ' + sec.bad + '×</span>' : '') +
    (sec && sec.ok ? '<span class="chip chip-neutral fbchip">' + esc(t('fbOk')) + ' ' + sec.ok + '×</span>' : '') +
    (sec && sec.skipped ? '<span class="chip chip-neutral fbchip">' + esc(t('fbSkipped')) + ' ' + sec.skipped + '×</span>' : '');
}

export function fbBody(p: FbPlan) {
  const fbk: NonNullable<FbPlan['feedback']> = p.feedback || { notes: [], comments: [] };
  const fill = fillT;
  const lines: string[] = [];
  if (p.ratings) lines.push(fill('fbSumYes', { y: p.yes, n: p.ratings }));
  const top = (p.heat || [])[0];
  if (top) lines.push(fill('fbSumHelp', { s: top.section_label || t('wholeLesson'), c: top.n === 1 ? t('fbTime1') : fill('fbTimesN', { c: top.n }) }));
  let h = lines.length ? '<p class="fbsum">' + lines.map(esc).join(' ') + '</p>' : '<p class="muted">' + esc(t('fbNoSignal')) + '</p>';

  if ((p.heat || []).length) {
    const max = Math.max(1, ...p.heat!.map((x) => x.n));
    h += '<div class="sect-h">' + esc(t('heatTitle')) + '</div>' + p.heat!.map((x) =>
      '<div class="heat"><span class="hl"><b>' + esc(x.section_label || t('wholeLesson')) + '</b><br><span class="muted">' + esc(kindLabel(x.kind, '')) + '</span></span>' +
      '<span class="hb"><i style="width:' + Math.round(x.n / max * 100) + '%"></i></span><b>' + x.n + '×</b></div>').join('');
    if (top && top.n >= 2) h += '<p class="fbwarn">' + esc(t('fbRewrite')) + '</p>';
  }

  // What substitutes said about each step, one tap per step per substitute.
  if ((p.sections || []).length) {
    h += '<div class="sect-h">' + esc(t('fbSecTitle')) + '</div>' + p.sections!.map((x) => {
      const n = x.good + x.ok + x.bad + x.skipped || 1;
      const seg = (key: 'good' | 'ok' | 'bad' | 'skipped', c: string) => x[key] ? '<i class="' + c + '" style="width:' + Math.round(x[key] / n * 100) + '%"></i>' : '';
      return '<div class="heat"><span class="hl"><b>' + esc(x.section_label || x.section_ref) + '</b></span>' +
        '<span class="hb secbar">' + seg('good', 'sb-w') + seg('ok', 'sb-c') + seg('bad', 'sb-b') + seg('skipped', 'sb-s') + '</span>' +
        '<span class="secn"><b class="sb-wt">' + x.good + '</b> / <b class="sb-ct">' + x.ok + '</b> / <b class="sb-bt">' + x.bad + '</b></span></div>' +
        (x.notes || []).map((nt) => '<blockquote>' + esc(nt) + '</blockquote>').join('');
    }).join('') +
      '<p class="muted" style="font-size:12px">' + esc(t('fbSecKey')) + '</p>';
    if (p.sections!.some((x) => x.bad >= 2)) h += '<p class="fbwarn">' + esc(t('fbRewrite')) + '</p>';
  }

  // The same plan can land well in one class and badly in another.
  if ((p.runs || []).length) {
    h += '<div class="sect-h">' + esc(t('fbRunsTitle')) + '</div>' + p.runs.map((x: RunFb) =>
      '<div class="runrow"><span class="rl"><b>' + esc(x.group) + '</b> · ' + esc(x.time ? x.time + ' · ' : '') + esc(fmtDate(x.date)) +
      (x.substitute ? ' · ' + esc(x.substitute) : '') + '</span>' +
      '<span class="rr">' + (x.answered
        ? (x.stars ? '<b>★ ' + esc(String(x.stars).replace('.', LANG === 'sv' ? ',' : '.')) + '</b> ' : '') +
          '<b class="sb-wt">' + x.good + '</b> / <b class="sb-ct">' + x.ok + '</b> / <b class="sb-bt">' + x.bad + '</b>'
        : '<span class="muted">' + esc(t('fbRunNone')) + '</span>') +
      (x.teacher ? ' <span class="chip chip-neutral">' + esc(t('fbTeach_' + x.teacher)) + '</span>' : '') + '</span></div>').join('');
  }

  const said: string[] = [];
  fbk.comments.forEach((c) => {
    const parts: string[] = [];
    if (c.coverage) parts.push('<b>' + esc(t(({ all: 'fbCovAll', part: 'fbCovPart', none: 'fbCovNone' } as StrMap)[c.coverage]!)) + '.</b>');
    if (c.left_off) parts.push(esc(t('fbNote')) + ': ' + esc(c.left_off));
    if (c.comment) parts.push(esc(c.comment));
    if (c.reasons && c.reasons.length) parts.push('<span class="muted">(' + esc(c.reasons.join(', ')) + ')</span>');
    if (parts.length) said.push('<blockquote>' + parts.join(' ') + '</blockquote>');
  });
  fbk.notes.forEach((n) => said.push('<blockquote>' + esc(t('fbOn')) + ' <b>' + esc(n.section_label || t('wholeLesson')) + '</b>: ' + esc(n.note) + '</blockquote>'));
  if (said.length) h += '<div class="sect-h">' + esc(t('fbSaid')) + '</div>' + said.join('');
  return h;
}

/* ── Feedback on autopilot ────────────────────────────────
   One coordinator cannot read every piece of extra help and every plan's
   feedback. So the page is a short to-do list, usually empty:

     extra help    decided by the substitute's thumb, or kept after a day with
                   no complaint; only help that fails the check waits here
     plans         only the ones with a signal: a step rated bad by two or
                   more, the same step needing help three times, or a plan
                   most substitutes would not reuse
     the fix       for a weak step, the AI drafts a rewrite of just that step
                   from what substitutes said; a person reads it and accepts

   Above it, the week in four numbers; below it, everything else, folded. */
function extraOk(b: Extra | null | undefined) {
  if (!b) return false;
  const has = (b.lines || []).some((x) => String(x || '').trim()) || !!String(b.board || '').trim() || (b.tasks || []).length > 0;
  const pointer = (a?: string) => !String(a || '').trim() || /^(se |see |enligt |as above|som ovan)/i.test(String(a).trim());
  return has && !(b.tasks || []).some((t) => !String(t.q || '').trim() || pointer(t.a));
}

export function attention(): Attn[] {
  const out: Attn[] = [];
  for (const p of state.fb) {
    const base = { plan: p.id, title: p.title || p.subject, subject: p.subject, year: p.year_group };
    const notesOf = (label?: string) => (p.feedback?.notes || []).filter((n) => !label || n.section_label === label).map((n) => n.note);
    for (const x of p.sections || []) {
      const total = x.good + x.ok + x.bad;
      if (x.bad >= 2) out.push({ ...base, kind: 'bad', ref: x.section_ref, label: x.section_label || x.section_ref, bad: x.bad, total, notes: [...(x.notes || []), ...notesOf(x.section_label)] });
    }
    const byRef = new Map<string, { n: number; label?: string; kinds: Set<string> }>();
    for (const h of p.heat || []) {
      const k = h.section_ref || 'lesson';
      const v = byRef.get(k) || { n: 0, label: h.section_label, kinds: new Set<string>() };
      v.n += h.n; v.kinds.add(kindLabel(h.kind, '')); byRef.set(k, v);
    }
    byRef.forEach((v, ref) => {
      if (v.n >= 3 && !out.some((o) => o.plan === p.id && o.ref === ref)) {
        out.push({ ...base, kind: 'help', ref, label: v.label || t('wholeLesson'), help: v.n, helpKinds: [...v.kinds].join(', '), notes: notesOf(v.label) });
      }
    });
    if ((p.ratings || 0) >= 3 && (p.yes || 0) / (p.ratings || 1) < 0.5) out.push({ ...base, kind: 'low', bad: (p.ratings || 0) - (p.yes || 0), total: p.ratings });
  }
  for (const x of state.queue) {
    out.push({ kind: 'extra', plan: x.plan_id || '', title: x.title || '', subject: x.subject, year: x.year_group, extra: x, label: x.section_label });
  }
  return out;
}

function fbSummary() {
  const weekAgo = Date.now() - 7 * 864e5;
  const runs = state.fb.flatMap((p) => p.runs || []).filter((r) => new Date(r.date).getTime() >= weekAgo);
  const answered = runs.filter((r) => r.answered);
  const stars = answered.map((r) => Number(String(r.stars || '').replace(',', '.'))).filter((n) => n > 0);
  const avg = stars.length ? (stars.reduce((a, n) => a + n, 0) / stars.length).toFixed(1).replace('.', LANG === 'sv' ? ',' : '.') : '—';
  const auto = state.extras.filter((x) => x.reviewed && x.auto_reason && x.auto_reason !== 'check_failed').length;
  const waiting = state.extras.filter((x) => !x.reviewed && extraOk(x.body)).length;
  const tile = (n: string | number, k: string, cls = '') => '<div class="fbtile' + cls + '"><b>' + esc(String(n)) + '</b><span>' + esc(t(k)) + '</span></div>';
  return '<div class="fbtiles">' +
    tile(runs.length, 'fbTLessons') + tile(answered.length ? '★ ' + avg : '—', 'fbTStars') +
    tile(auto, 'fbTAuto') + tile(state.attn.length, 'fbTNeeds', state.attn.length ? ' hot' : ' calm') + '</div>' +
    (waiting ? '<p class="hint">' + esc(fillT('fbWaiting', { n: waiting })) + '</p>' : '');
}

function attnCard(a: Attn, i: number) {
  const head = '<div class="tags"><span class="chip chip-neutral">' + esc(subjectLabel(a.subject)) + '</span><span class="chip chip-neutral">' + esc(yearLabel(a.year)) + '</span>' +
    '<span class="chip ' + (a.kind === 'extra' ? 'chip-blue' : 'chip-warn') + '">' + esc(t('fbWhy_' + a.kind)) + '</span></div>' +
    '<h4>' + esc(a.title) + '</h4>';
  if (a.kind === 'extra') {
    const x = a.extra!;
    return '<div class="bcard fx attn">' + head +
      '<p class="fbreason">' + esc(fillT('fbExtraFailed', { s: x.section_label || t('wholeLesson'), k: kindLabel(x.kind, x.variant) })) + '</p>' +
      extraText(x) +
      '<div style="display:flex;gap:6px"><button class="btn btn-ok btn-sm" data-review="' + x.id + ':1">' + esc(t('keep')) + '</button>' +
      '<button class="btn btn-ghost btn-sm" data-review="' + x.id + ':0">' + esc(t('hide')) + '</button></div></div>';
  }
  const why = a.kind === 'bad' ? fillT('fbBadStep', { s: a.label, b: a.bad, n: a.total })
    : a.kind === 'help' ? fillT('fbHelpStep', { s: a.label, n: a.help, k: a.helpKinds })
    : fillT('fbLowPlan', { b: a.bad, n: a.total });
  const key = a.plan + '|' + (a.ref || '');
  const fx = state.fixes[key];
  let fixBox = '';
  if (fx?.busy) fixBox = '<div class="fixbox"><span class="spin"></span> ' + esc(t('fbFixing')) + '</div>';
  else if (fx?.err) fixBox = '<div class="fixbox err">' + esc(fx.err) + '</div>';
  else if (fx?.after) fixBox = '<div class="fixbox">' + fixDiff(fx.before!, fx.after) +
    '<div style="display:flex;gap:6px;margin-top:8px"><button class="btn btn-primary btn-sm" data-fbuse="' + i + '">' + esc(t('fbUseFix')) + '</button>' +
    '<button class="btn btn-ghost btn-sm" data-fbdrop="' + i + '">' + esc(t('fbDropFix')) + '</button></div>' +
    '<p class="hint">' + esc(t('fbFixReapprove')) + '</p></div>';
  return '<div class="bcard fx attn">' + head + '<p class="fbreason">' + esc(why) + '</p>' +
    ((a.notes || []).length ? a.notes!.slice(0, 3).map((n) => '<blockquote>' + esc(n) + '</blockquote>').join('') : '') +
    (fixBox || '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      (a.kind !== 'low' ? '<button class="btn btn-primary btn-sm" data-fbfix="' + i + '">✦ ' + esc(t('fbDraftFix')) + '</button>' : '') +
      '<button class="btn btn-ghost btn-sm" data-viewplan="' + a.plan + '">' + esc(t('openPlan')) + ' →</button></div>') +
    '</div>';
}

/** What the AI changed, as before/after text — only the parts that differ. */
function fixDiff(before: Plan, after: Plan) {
  const flat = (o: unknown, path = '', acc: Record<string, string> = {}) => {
    if (o && typeof o === 'object') {
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) flat(v, path ? path + '.' + k : k, acc);
    } else if (o != null && String(o).trim()) acc[path] = String(o);
    return acc;
  };
  const a = flat(before), b = flat(after);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]);
  if (!keys.length) return '<p class="hint">' + esc(t('fbNoChange')) + '</p>';
  return '<div class="fixdiff">' + keys.slice(0, 14).map((k) =>
    '<div class="fd"><code>' + esc(k) + '</code>' +
      (a[k] ? '<del>' + esc(a[k]) + '</del>' : '') + (b[k] ? '<ins>' + esc(b[k]) + '</ins>' : '') + '</div>').join('') +
    (keys.length > 14 ? '<p class="hint">+' + (keys.length - 14) + '</p>' : '') + '</div>';
}

export function renderFeedback() {
  const sum = maybe$('fbsummary'); if (sum) sum.innerHTML = fbSummary();
  $('fbqueue').innerHTML = state.attn.length
    ? state.attn.map(attnCard).join('')
    : '<p class="note fbcalm">✓ ' + esc(t('fbAllGood')) + '</p>';

  $('fbplans').innerHTML = state.fb.length
    ? state.fb.map((p) =>
      '<div class="bcard fx clickable" data-viewplan="' + p.id + '" title="' + esc(t('fbOpenHint')) + '">' +
        '<h4>' + esc(p.title || p.subject) + '</h4>' +
        '<div class="tags"><span class="chip chip-neutral">' + esc(subjectLabel(p.subject)) + '</span><span class="chip chip-neutral">' + esc(yearLabel(p.year_group)) + '</span></div>' +
        fbBody(p) +
        '<div><span class="btn btn-soft btn-sm">' + esc(t('openPlan')) + ' →</span></div>' +
      '</div>').join('')
    : '<p class="note">' + esc(t('fbEmpty')) + '</p>';
  const auto = state.extras.filter((x) => x.reviewed);
  const ah = maybe$('fbautoH'); if (ah) ah.textContent = fillT('fbAutoH', { n: auto.length });
  const ab = maybe$('fbauto');
  if (ab) ab.innerHTML = auto.length ? auto.map((x) =>
    '<div class="bcard fx"><div class="tags"><span class="chip ' + (x.kept ? 'chip-ok' : 'chip-neutral') + '">' + esc(t(x.kept ? 'fbKept' : 'fbHidden')) + '</span>' +
      '<span class="chip chip-neutral">' + esc(t('fbReason_' + (x.auto_reason || 'person'))) + '</span>' +
      '<span class="chip chip-blue">' + esc(kindLabel(x.kind, x.variant)) + '</span></div>' +
      '<div class="plan-meta">' + esc((x.title || '') + (x.section_label ? ' · ' + x.section_label : '')) + '</div>' + extraText(x) + '</div>').join('')
    : '<p class="note">—</p>';
}

/** Draft a fix for one flagged step: the AI rewrites only that part. */
export async function draftFix(i: number) {
  const a = state.attn[i]; if (!a) return;
  const key = a.plan + '|' + (a.ref || '');
  state.fixes[key] = { busy: true }; renderFeedback();
  const { data: pl, error } = await sb.rpc('lk_plan', { p_id: a.plan });
  if (error || !pl) { state.fixes[key] = { err: error?.message || t('errUnknown') }; renderFeedback(); return; }
  const res = await invokeGen({
    request: { subject: pl.subject, year_group: pl.year_group, minutes: pl.minutes, language: pl.language },
    fix: { plan: pl.body, ref: a.ref, label: a.label, language: pl.language,
           feedback: { bad: a.bad, total: a.total, help: a.help, helpKinds: a.helpKinds, notes: a.notes } },
  });
  if (res.error || res.data?.error || !res.data?.plan) {
    state.fixes[key] = { err: genErrText(res.data, res.error) };
  } else state.fixes[key] = { before: pl.body as Plan, after: res.data.plan as Plan };
  renderFeedback();
}

export async function useFix(i: number) {
  const a = state.attn[i]; if (!a) return;
  const key = a.plan + '|' + (a.ref || '');
  const fx = state.fixes[key]; if (!fx?.after) return;
  const { data, error } = await sb.rpc('lk_update_plan_body', { p_id: a.plan, p_body: fx.after, p_note: fillT('fbFixNote', { s: a.label || '' }) });
  if (error || !data || data.ok === false) { toast(error?.message || t('errNeedsDb'), 8000); return; }
  delete state.fixes[key];
  delete state.checks[a.plan];
  toast(t('fbFixed'));
  // The translation was of the old body: write the other language again.
  const { data: pl } = await sb.rpc('lk_plan', { p_id: a.plan });
  if (pl) {
    const other = pl.language === 'en' ? 'sv' : 'en';
    (async () => {
      try {
        const tr = await invokeGen({ request: { subject: pl.subject, year_group: pl.year_group, minutes: pl.minutes, language: other }, translate: pl.body });
        if (!tr.error && tr.data?.plan) await sb.rpc('lk_fill_alt', { p_id: a.plan, p_language: other, p_body: tr.data.plan });
      } catch { /* the plan still works in its own language */ }
    })();
  }
  loadFeedback();
}

/** Bank or feedback, inside the one Lesson plans screen. */
export function showPlansTab(which: string) {
  state.tab = which;
  $('tab-bank').hidden = which !== 'bank';
  $('tab-feedback').hidden = which !== 'feedback';
  $('tab-term').hidden = which !== 'term';
  document.querySelectorAll('[data-tab]').forEach((b) =>
    b.classList.toggle('on', b.getAttribute('data-tab')! === which));
  $('tabbadge').textContent = state.pending ? String(state.pending) : '';
  $('tabbadge').hidden = !state.pending;
  // One render, after both: the uses decide each card's "last given" line.
  if (which === 'bank') loadUses().catch(() => {}).then(() => loadBank());
  if (which === 'feedback') loadFeedback();
  if (which === 'term') loadTerm();
  setTitles();
}



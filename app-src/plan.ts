import type { Plan } from './types';
import type { RenderOpts } from './plan-view';
import { SV_LABELS, EN_LABELS, type Labels } from './plan-labels';
import { deckScope, deckAll, type Slide } from './deck';

type Lang = 'sv' | 'en';
interface Extra { title?: string; minutes?: number; lines?: string[]; board?: string; tasks?: { q?: string; a?: string }[] }
/** A plan as lk_plan_by_token returns it: the body in one language, optionally the other. */
interface PlanRow {
  language?: string; body: Plan; language_alt?: string | null; body_alt?: Plan | null;
  subject: string; year_group: string; minutes: number; school: string; title: string; model?: string;
}
interface RunInfo {
  group_name: string; lesson_time?: string; used_on: string; substitute?: string; expires_at?: string;
  expired?: boolean; plan_token?: string;
}
interface LinkedInfo { url?: string; label?: string; note?: string; expires_at?: string; expired?: boolean }
interface TeacherView extends PlanRow {
  group_name: string; used_on: string; substitute?: string; teacher_verdict?: string; teacher_note?: string;
  substitute_said?: { coverage?: 'all' | 'part' | 'none'; left_off?: string; comment?: string }[];
}
interface ExtraRow {
  id: number | string; section_ref: string; section_label?: string; kind: string; variant?: string;
  language: string; body: Extra; language_alt?: string | null; body_alt?: Extra | null; kept?: boolean;
}
interface Prog {
  ready: Record<string, boolean>; done: Record<number, boolean>; short: boolean;
  sec: Record<string, { v?: string; note?: string }>; stars?: number; fbopen?: boolean;
}
interface AssistOpts { kind: string; ref?: string; label?: string; text?: string; variant?: string; minutes?: number; fresh?: boolean }

const sb = window.supabase.createClient(
  'https://pbamabzbfbkxajntsrmc.supabase.co',
  'sb_publishable_XtMg3eLikZtI-UkNspIwcA_bWGvj428'
);
const params = new URLSearchParams(location.search);
/* A class link (?r=) names one delivery: this plan, this class, this day. It
   resolves to the plan's own token on load, so everything below keeps working
   from `token`; KEYID is known up front and keys this browser's state per
   class, so a second class on the same plan starts clean. */
const RUN_CODE = params.get('r');
let token: string | null = params.get('t');
let RUN: RunInfo | null = null;
const KEYID = RUN_CODE ? 'r_' + RUN_CODE : token;
let DATA: PlanRow | null = null;
const ASPECTS: Record<string, string> = { reuse: '', clarity: '', timefit: '' };

/* The three questions save as they are tapped, so the second tap has to find
   the row the first one made — without claiming to be the previous substitute,
   whose answers must stand. A random id per share link, kept in this browser,
   keeps one substitute's three answers together and the next one's apart. */
const SESSION = (() => {
  if (RUN_CODE) return 'r_' + RUN_CODE;   // the server ties feedback to the delivery by this
  const k = 'lk.sess.' + token;
  try {
    let v = localStorage.getItem(k);
    if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, v); }
    return v;
  } catch { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
})();
let EXTRAS: ExtraRow[] = [];
let REASONS = new Set<string>();

/* Where this substitute has got to: what is ticked off in Get ready, which
   steps are finished, whether the short version is on, and what they said
   about each step. Kept in this browser per share link, so a refresh halfway
   through the lesson does not send them back to step 1. */
const PROG: Prog = (() => {
  const base: Prog = { ready: {}, done: {}, short: false, sec: {} };
  try { return Object.assign(base, JSON.parse(localStorage.getItem('lk.prog.' + KEYID) || '{}')); } catch { return base; }
})();
const saveProg = () => { try { localStorage.setItem('lk.prog.' + KEYID, JSON.stringify(PROG)); } catch { /* private window */ } };
// The substitute may not read Swedish comfortably, so they pick, not the school.
// Empty until a plan loads and picks a language it actually has.
let LANG = (params.get('lang') || (() => { try { return localStorage.getItem('lk.lang') || ''; } catch { return ''; } })()) as Lang;
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"]/g, (c) => ESC[c] ?? c);
function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error('missing #' + id);
  return el as T;
}
const maybe$ = <T extends HTMLElement = HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;

const L = (): Labels => (LANG === 'en' ? EN_LABELS : SV_LABELS);



/* ── What the class teacher sees ─────────────────────────
   They are the only person in the chain who can tell whether the content was
   correct and whether it suited this particular class. The coordinator cannot
   — they are not a chemist — and the substitute can only report whether it was
   deliverable, which is a different question entirely.

   Kept to three taps and one optional line, because this is read between
   lessons by someone who has just come back from being ill. The plan itself is
   below the question so they can check it, but the question comes first. */
function renderTeacher(d: TeacherView) {
  const l = L();
  const all: Record<string, Plan> = { [d.language || 'sv']: d.body };
  if (d.body_alt && d.language_alt) all[d.language_alt] = d.body_alt;
  const p: Plan = all[LANG] || all[d.language || 'sv'] || {};
  const said = d.substitute_said || [];
  const covText: Record<string, string> = { all: l.covAll, part: l.covPart, none: l.covNone };

  $('out').innerHTML =
    '<div class="card">' +
      '<span class="kicker">' + esc(l.tKicker) + '</span>' +
      '<h1>' + esc(p.title || d.title) + '</h1>' +
      '<p class="muted">' + esc(d.group_name) + ' · ' +
        esc(new Date(d.used_on).toLocaleDateString(LANG === 'sv' ? 'sv-SE' : 'en-GB',
          { weekday: 'long', day: 'numeric', month: 'long' })) +
        (d.substitute ? ' · ' + esc(d.substitute) : '') + '</p>' +
      (said.length
        ? '<div class="ps"><h3>' + esc(l.tSubSaid) + '</h3>' + said.map((x) =>
            '<p style="margin:4px 0">' +
            (x.coverage ? '<b>' + esc(covText[x.coverage] || x.coverage) + '.</b> ' : '') +
            (x.left_off ? esc(l.covLeftLbl) + ': ' + esc(x.left_off) + '. ' : '') +
            (x.comment ? esc(x.comment) : '') + '</p>').join('') + '</div>'
        : '') +
    '</div>' +

    '<div class="card ratebox noprint">' +
      '<h3>' + esc(l.tQuestion) + '</h3>' +
      '<p class="muted" style="margin:0 0 10px">' + esc(l.tWhy) + '</p>' +
      '<div class="qpick" id="tverdict">' +
        [['right', l.tRight], ['mostly', l.tMostly], ['wrong', l.tWrong]].map((o) =>
          '<button data-tv="' + o[0] + '"' + (d.teacher_verdict === o[0] ? ' class="on"' : '') +
          '>' + esc(o[1]) + '</button>').join('') + '</div>' +
      '<label for="tnote" style="display:block;font-size:13px;font-weight:600;margin:14px 0 5px">' +
        esc(l.tNoteLbl) + '</label>' +
      '<div class="noterow"><input id="tnote" type="text" maxlength="400" placeholder="' +
        esc(l.tNotePh) + '" value="' + esc(d.teacher_note || '') + '">' +
        '<button data-tnote>' + esc(l.send) + '</button></div>' +
      '<p class="hint" style="margin:6px 0 0">' + esc(l.tNoteHint) + '</p>' +
      '<p id="tmsg" class="hint" style="margin-top:10px"></p>' +
    '</div>' +

    '<div class="card"><h3>' + esc(l.tThePlan) + '</h3>' +
      '<p>' + esc(p.summary || '') + '</p>' +
      '<p style="font-size:13px;color:var(--ink-soft)"><b>' + esc(l.goal) + '</b> ' + esc(p.goal || '') + '</p>' +
      // Parenthesised deliberately: a bare ternary here takes the whole
      // concatenation above as its condition and throws the card away.
      ((p.tasks || []).length
        ? '<h4 style="margin-top:14px">' + esc(l.tasks) + '</h4><ol style="font-size:13.5px">' +
          (p.tasks || []).map((x) => '<li>' + esc(x.q) + '<br><span class="ans">' + esc(x.a) + '</span></li>').join('') +
          '</ol>'
        : '') +
    '</div>';
}

/* ── A plan the school already had ───────────────────────
   Wrapped rather than handed over as a bare link: the substitute still gets
   the school's framing, and the class teacher still gets told how far the
   lesson got. Nothing here is rated and nothing is banked — it is somebody
   else's work, and a score on a named colleague's lesson is a quarrel, not a
   signal.

   Google's editors refuse to be framed on their /edit URL but allow /preview,
   so those are rewritten. Everything else is offered as an embed with the
   plain link kept in front of it, because a site that refuses framing gives
   the page no way to find out. */
/** Only http(s) is ever a link here. A stored "javascript:" or "data:" URL
 *  would otherwise run in this page's origin — the same origin as the
 *  coordinator app — from a link a coordinator saved. */
function safeUrl(u: string | null | undefined): string | null {
  try { const url = new URL(String(u || '')); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null; }
  catch { return null; }
}

function embedUrl(u: string): string | null {
  const safe = safeUrl(u);
  if (!safe) return null;
  const url = new URL(safe);
  if (/^(docs|drive)\.google\.com$/.test(url.hostname)) {
    const m = url.pathname.match(/^\/(document|presentation|spreadsheets|file)\/d\/([^/]+)/);
    if (m) return 'https://' + url.hostname + '/' + m[1] + '/d/' + m[2] + '/preview';
  }
  return safe;
}

function renderLinked(d: LinkedInfo) {
  const l = L();
  const link = safeUrl(d.url);
  const emb = link ? embedUrl(link) : null;
  const what = d.label || (d.url ? l.linkedFrom : l.linkedNote);
  const until = d.expires_at ? new Date(d.expires_at) : null;
  const untilLine = until && !d.expired
    ? '<p class="hint">' + esc(l.linkedUntil) + ' ' +
      esc(runDate(new Date(until.getTime() - 1000).toISOString().slice(0, 10))) + '</p>' : '';
  $('out').innerHTML =
    '<div class="card">' +
      '<span class="kicker">' + esc(l.linkedKicker) + '</span>' +
      '<h1>' + esc(what) + '</h1>' +
      untilLine +
      (d.expired ? '<div class="flag"><span>!</span><div><b>' + esc(l.linkedGoneH) + '</b> ' + esc(l.linkedGoneB) + '</div></div>' : '') +
      // Typed instructions have no button to press, so they must not be told
      // to press one. The teacher's own words are never translated — they are
      // the teacher's, and a rough translation of a safety instruction is worse
      // than the original. The reader can still choose to translate it with the
      // browser (translate="yes" below), which is their call and shows them the
      // original underneath on hover; we never do it for them.
      (d.expired ? '' : '<p class="muted">' + esc(d.url ? l.linkedBody : l.noteBody) + '</p>') +
      (d.note ? '<div class="ps"><h3>' + esc(l.linkedNoteH) + '</h3><p translate="yes" style="white-space:pre-wrap">' + esc(d.note) + '</p></div>' : '') +
      (link
        // The button always works. The preview often does not — a document
        // shared only with the teacher, a site that refuses to be framed, and
        // nothing on this page can tell the difference from the outside. So it
        // is folded away: a substitute five minutes before the bell meets a
        // confident button, not somebody else's error page.
        ? '<p class="noprint"><a class="openbtn" href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(l.linkedOpen) + ' ↗</a></p>' +
          (emb ? '<details class="peek noprint"><summary>' + esc(l.linkedPeek) + '</summary>' +
                 '<div class="embed"><iframe src="' + esc(emb) + '" title="' + esc(what) + '" loading="lazy"></iframe></div>' +
                 '<p class="hint">' + esc(l.linkedFallback) + '</p></details>' : '')
        : '') +
    '</div>' +
    '<div class="card ratebox noprint">' +
      '<h3>' + esc(l.covTitle) + '</h3>' +
      '<div class="covrow" id="covrow">' +
        (['all', 'part', 'none'] as const).map((k) =>
          '<button data-lcov="' + k + '">' + esc(l[{ all: 'covAll', part: 'covPart', none: 'covNone' }[k] as 'covAll']) + '</button>').join('') + '</div>' +
      '<label for="leftoff" style="display:block;font-size:13px;font-weight:600;margin:12px 0 5px">' + esc(l.leftLbl) + '</label>' +
      '<div class="noterow"><input id="leftoff" type="text" maxlength="300" placeholder="' + esc(l.leftOff) + '">' +
        '<button data-lleft>' + esc(l.send) + '</button></div>' +
      '<p class="hint" style="margin:6px 0 0">' + esc(l.leftHint) + '</p>' +
      '<p id="lratemsg" class="hint" style="margin-top:10px"></p>' +
      '<p class="hint" style="margin:10px 0 0">' + esc(l.linkedNoRate) + '</p>' +
    '</div>';
}

function runDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString(LANG === 'sv' ? 'sv-SE' : 'en-GB',
    { weekday: 'short', day: 'numeric', month: 'short' });
}

/* Minutes to add so the plan's own clock (e.g. 00:30-00:52) reads as the real
   lesson time (13:30-13:52). Only class links know the real start. */
function shiftT(tt: string | undefined, sh: number) {
  if (!sh || !tt) return tt;
  return String(tt).replace(/(\d{1,2}):(\d{2})/g, (_m, h: string, mi: string) => {
    const v = (((+h * 60 + +mi + sh) % 1440) + 1440) % 1440;
    return ('0' + Math.floor(v / 60)).slice(-2) + ':' + ('0' + (v % 60)).slice(-2);
  });
}
function clockShift(p: Plan) {
  const m = RUN && RUN.lesson_time && String(RUN.lesson_time).match(/(\d{1,2}):(\d{2})/);
  const f = p && (p.phases || [])[0] && String(p.phases![0]!.t || '').match(/(\d{1,2}):(\d{2})/);
  if (!m || !f) return 0;
  return (+m[1]! * 60 + +m[2]!) - (+f[1]! * 60 + +f[2]!);
}

/* Which class this is for, and until when the link works. Shown above the
   title so a substitute with two classes on one plan sees at a glance which
   link they are holding. */
function runBand() {
  if (!RUN) return '';
  const l = L();
  const until = RUN.expires_at ? new Date(RUN.expires_at) : null;
  return '<div class="runband"><b>' + esc(RUN.group_name) + '</b>' +
    (RUN.lesson_time ? ' · ' + esc(RUN.lesson_time) : '') +
    ' · ' + esc(runDate(RUN.used_on)) +
    (RUN.substitute ? ' · ' + esc(RUN.substitute) : '') +
    (until ? '<span class="until">' + esc(l.runUntil) + ' ' + esc(runDate(new Date(until.getTime() - 1000).toISOString().slice(0, 10))) + '</span>' : '') +
    '</div>';
}

/* ── Loading ─────────────────────────────────────────── */
async function load() {
  if (RUN_CODE) {
    const rr = await sb.rpc('lk_run_by_token', { p_run: RUN_CODE });
    RUN = rr.data;
    if (!RUN) { $('out').innerHTML = '<p class="muted">' + esc(L().notFound) + '</p>'; return; }
    if (RUN.expired || !RUN.plan_token) {
      $('out').innerHTML = '<div class="full"><div class="offl">' + esc(L().runExpiredH) + '</div>' +
        '<p class="muted">' + esc(L().runExpiredB.replace('{g}', RUN.group_name).replace('{d}', runDate(RUN.used_on))) + '</p></div>';
      return;
    }
    token = RUN.plan_token;
  }
  if (!token) { $('out').innerHTML = '<p class="muted">' + esc(L().noCode) + '</p>'; return; }

  // The class teacher's own door. Same link shape, different question: the
  // substitute is asked whether the lesson could be delivered, the teacher
  // whether it was right.
  if (params.get('as') === 'teacher') {
    const tv = await sb.rpc('lk_teacher_view', { p_token: token });
    if (tv.data) { renderTeacher(tv.data); return; }
  }

  // A teacher's own plan arrives through the same door as a generated one, so
  // the substitute never has to know which kind they were sent.
  const linked = await sb.rpc('lk_linked_by_token', { p_token: token });
  if (linked.data) { renderLinked(linked.data); return; }

  const [plan, extras] = await Promise.all([
    sb.rpc('lk_plan_by_token', { p_token: token }),
    sb.rpc('lk_extras_by_token', { p_token: token }),
  ]);
  const ck = 'lk.plan.' + token;
  if (plan.error && !plan.data) {
    try {
      const c = JSON.parse(localStorage.getItem(ck) || 'null');
      if (c && c.plan) { OFFLINE = true; EXTRAS = c.extras || []; render(c.plan); return; }
    } catch { /* no cache */ }
  }
  if (plan.error || !plan.data) {
    $('out').innerHTML =
      '<p class="muted">' + esc(L().notFound) + '</p>';
    return;
  }
  EXTRAS = Array.isArray(extras.data) ? extras.data : [];
  try { localStorage.setItem(ck, JSON.stringify({ plan: plan.data, extras: EXTRAS })); } catch { /* private window */ }
  render(plan.data);
}

function bodies(d: PlanRow): Partial<Record<Lang, Plan>> {
  const b: Partial<Record<Lang, Plan>> = {};
  b[(d.language || 'sv') as Lang] = d.body;
  if (d.body_alt && d.language_alt) b[d.language_alt as Lang] = d.body_alt;
  return b;
}

/* ── Live assist ─────────────────────────────────────── */

// Buttons that act on one part of the plan. section_ref is what turns a
// press into per-section signal later.
function assistRow(ref: string, label: string | undefined) {
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
function extraBody(x: Partial<ExtraRow>): { body: Extra | null | undefined; exact: boolean; lang?: string } {
  if (x.language === LANG) return { body: x.body, exact: true };
  if (x.language_alt === LANG && x.body_alt) return { body: x.body_alt, exact: true };
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
  const hit = EXTRAS.filter((x) =>
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

let LASTASSIST: AssistOpts | null = null;
async function runAssist(opts: AssistOpts) {
  const l = L();
  LASTASSIST = opts;
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

  if (!DATA) return;
  const p = currentBody();
  const payload = {
    kind: opts.kind,
    section_ref: opts.ref,
    section_label: opts.label,
    section_text: opts.text || '',
    variant: opts.variant || '',
    language: LANG,
    subject: DATA.subject,
    year_group: DATA.year_group,
    topic: p?.title || DATA.title,
    minutes_left: opts.minutes || undefined,
    fresh: opts.fresh || undefined,
    // The plan this help is charged to; lk-assist takes from its daily cap.
    token,
  };

  // Check the quota first. Once a real model is connected, a blocked
  // request must not cost a generation.
  const q = await sb.rpc('lk_assist_quota', { p_token: token });
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
    p_token: token,
    p_section_ref: opts.ref,
    p_section_label: opts.label || null,
    p_kind: opts.kind,
    p_variant: opts.variant || null,
    p_language: data.language || LANG,
    p_body: data.extra,
    p_model: data.model || null,
    p_body_alt: data.extra_alt || null,
    p_language_alt: data.extra_alt ? data.language_alt : null,
  });

  const ok = saved.data?.ok;
  const note = ok ? l.saved : saved.data?.error === 'quota' ? l.quota : '';
  $('sheetbody').innerHTML = sheetHtml(data.extra, data.source, note, ok ? saved.data.id : null, opts);

  if (ok) {
    EXTRAS.push({
      id: saved.data.id,
      section_ref: opts.ref || '', section_label: opts.label, kind: opts.kind,
      variant: opts.variant,
      language: data.language || LANG, body: data.extra,
      language_alt: data.extra_alt ? data.language_alt : null,
      body_alt: data.extra_alt || null,
    });
    render(DATA, true);
  }
}

function currentBody() {
  if (!DATA) return null;
  const all = bodies(DATA);
  return all[LANG] || all[(DATA.language || 'sv') as Lang] || null;
}

/* ── Render ──────────────────────────────────────────── */
function render(d: PlanRow, keepScroll?: boolean) {
  const y = keepScroll ? window.scrollY : 0;
  DATA = d;
  const all = bodies(d);
  if (!all[LANG]) LANG = (d.language || Object.keys(all)[0]) as Lang;
  const p = all[LANG] || {};
  const choices = Object.keys(all);
  const l = L();

  if (QUICK) {
    let q = '<div class="qmode"><div class="subhead"><div class="subhead-row"><div><h1>' + esc(l.quickTitle) + ' — ' + esc(p.title) + '</h1>' +
      '<div class="m">' + esc(l.quickHint) + '</div></div></div></div>' +
      '<div class="strow noprint"><button class="stbtn" data-quick="0">' + esc(l.fullBtn) + '</button></div>' +
      '<div class="flag" style="background:#f0f5fb;color:#14407a"><span>①</span><div><b>' + esc(l.first90) + '</b><ul style="margin:6px 0 0;padding-left:18px">' +
        (p.first90||[]).map(x=>'<li>'+esc(x)+'</li>').join('') + '</ul></div></div>' +
      '<div class="ps"><h4>' + esc(l.board) + '</h4><div class="board">' + esc(p.board) + '</div>' +
      '<p style="margin-top:8px;font-size:13px"><b>' + esc(l.need) + '</b> ' + esc(p.equipment?.need) + '</p></div>' +
      '<div class="ps"><h4>' + esc(l.clock) + '</h4>' + (p.phases||[]).map((ph) =>
        '<p style="margin:4px 0;font-size:14px"><span class="clock">' + esc(shiftT(ph.t, clockShift(p))) + '</span> <strong>' + esc(ph.n) + '</strong></p>').join('') + '</div>' +
      '<div class="strow noprint"><button class="stbtn" data-student="lesson">' + esc(l.studentSheet) + '</button></div></div>';
    $('out').innerHTML = q; $('bar').hidden = true;
    if (keepScroll) window.scrollTo(0, y);
    return;
  }

  const phases = p.phases || [];
  const hooks: RenderOpts = {
    lbl: (k: string) => (l as unknown as Record<string, string>)[k] ?? '',
    depth: DEPTH as 'full' | 'guided' | 'brief',
    assistRow: (ref: string, name?: string) => assistRow(ref, name),
    projector: true,
    shiftMin: clockShift(p),
    help: false,                       // lifted into the margin rail below
    interactive: true,
    ready: PROG.ready, done: PROG.done, short: PROG.short,
  };

  // ── Teach mode: one phase, nothing else ──────────────────
  // A substitute mid-lesson is not reading, they are performing.
  if (TEACH) {
    const i = Math.max(0, Math.min(TPHASE, phases.length - 1));
    const one = window.LKPlan.render(p, Object.assign({}, hooks,
      // done:{} so a finished step still shows when you go Back to it; in this
      // view "Done" moves on instead of folding the only thing on screen.
      { only: i, done: {}, assistRow: () => '', extras: () => '' }));
    $('out').innerHTML =
      '<div class="teachview"><div class="tv">' + one + '</div>' +
      '<div class="tvbar"><button data-teach="0">' + esc(l.prepBtn) + '</button>' +
      '<button data-projdeck>' + esc(l.projDeck) + '</button>' +
      '<div class="tvdots">' + phases.map((_, j) =>
        '<i class="' + (j === i ? 'on' : '') + '"></i>').join('') + '</div>' +
      '<span class="pos">' + (i + 1) + ' ' + esc(l.phaseOf) + ' ' + phases.length + '</span>' +
      '<span class="sp"></span>' +
      '<button data-tph="' + (i - 1) + '"' + (i === 0 ? ' disabled' : '') + '>' + esc(l.prevPhase) + '</button>' +
      '<button class="pri" data-tph="' + (i + 1) + '"' + (i >= phases.length - 1 ? ' disabled' : '') + '>' +
        esc(l.nextPhase) + '</button></div></div>';
    document.body.classList.add('teach');
    $('bar').hidden = true;
    return;
  }
  document.body.classList.remove('teach');

  let h =
    '<div class="full">' +
    (d.model === 'canned' ? '<div class="offl noprint">' + esc(l.simBanner) + '</div>' : '') +
    (OFFLINE ? '<div class="offl noprint">' + esc(l.offlineNote) + '</div>' : '') +
    '<div class="subhead">' + runBand() + '<div class="subhead-row"><div>' +
    '<h1>' + esc(p.title) + '</h1>' +
    '<div class="m">' + esc(d.subject) + ' · ' + esc(d.year_group) + ' · ' + d.minutes + ' min · ' + esc(d.school) + '</div>' +
    '</div>' +
    (choices.length > 1
      ? '<div class="langpick noprint">' + choices.map((c) =>
          '<button data-pick="' + c + '"' + (c === LANG ? ' class="on"' : '') + '>' + (c === 'sv' ? 'SV' : 'EN') + '</button>').join('') + '</div>'
      : '') +
    '</div>' +
    // Start sits inside the hero: the first thing a substitute sees is what to press.
    '<div class="startrow noprint"><button class="startbtn" data-teach="1">' + esc(l.teachBtn) + '</button>' +
    '<span class="starthint">' + esc(l.teachHint) + '</span></div></div>' +
    '<div class="strow noprint">' +
    '<button class="stbtn" data-quick="1">' + esc(l.quickBtn) + '</button>' +
    '<button class="stbtn" data-student="lesson">' + esc(l.studentSheet) + '</button>' +
    '<button class="stbtn" data-pack>' + esc(l.packBtn) + '</button></div>' +
    '<div class="depthrow noprint"><span class="dl">' + esc(l.depthQ) + '</span>' +
    [['full', l.depthFull], ['guided', l.depthGuided], ['brief', l.depthBrief]].map((x) =>
      '<button data-depth="' + x[0] + '"' + (DEPTH === x[0] ? ' class="on"' : '') + '>' + esc(x[1]) + '</button>').join('') +
    '</div></div>';

  // Where you are in the lesson, in the left margin.
  h += '<aside class="rail rail-l noprint"><div class="rail-in"><div class="nav"><h4>' + esc(l.railWhere) + '</h4>' +
    phases.map((ph, i) => '<a href="#ph' + i + '" class="' + window.LKPlan.kind(i) + '">' + esc(ph.n) +
      '<span class="t">' + esc(shiftT(ph.t, clockShift(p))) + '</span></a>').join('') + '</div></aside>';

  h += '<main class="col">' + window.LKPlan.render(p, hooks) + '</main>';

  // Help lives in the right margin, because it is needed at the moment there is
  // no time to go looking for it.
  h += '<aside class="rail rail-r"><div class="rail-in">' + window.LKPlan.help(p, hooks.lbl!) + '</div></aside>';

  h += '<hr class="after-rule noprint">' +
    '<div class="full">' + window.LKPlan.after(p, hooks.lbl!) + '</div>';

  h += '<div class="full"><div class="onlyprint"><div id="studentprint" class="stprint">' + studentParts('lesson').html + '</div></div>';

  // ── Feedback ─────────────────────────────────────────────
  // Everything the substitute is asked, in one panel in a different colour, so
  // it is plain that it is not part of the lesson. Per step first (one tap
  // each), then how far they got, then the three questions. All optional, all
  // saved as they are tapped.
  const SECV = [['good', l.fbGood], ['ok', l.fbOk], ['bad', l.fbBad]];
  const STARS = Number(PROG.stars || 0);
  h += '<section class="fbpanel noprint" id="feedback">' +
    '<button class="fb-open" data-fbtoggle aria-expanded="' + (PROG.fbopen ? 'true' : 'false') + '">' +
      '<span><b>' + esc(l.fbOpen) + '</b><small>' + esc(l.fbOpenSub) + '</small></span><i class="fb-caret">&#9662;</i></button>' +
    '<div class="fb-body"' + (PROG.fbopen ? '' : ' hidden') + '>' +
    '<p class="fb-intro">' + esc(l.fbIntro) + '</p>' +
    '<h4>' + esc(l.fbSteps) + '</h4>' +
    phases.map((ph, i) => {
      const ref = 'phase:' + i, cur = PROG.sec[ref] || {};
      return '<div class="fb-row" data-fbrow="' + ref + '">' +
        '<div class="fb-top"><div class="fb-lbl"><span class="fb-n">' + (i + 1) + '</span>' + esc(ph.n) + '</div>' +
        '<div class="fb-pick">' + SECV.map((o) =>
          '<button data-sec="' + ref + '|' + o[0] + '" class="fb-' + o[0] + (cur.v === o[0] ? ' on' : '') + '">' + esc(o[1]) + '</button>').join('') +
          '<button data-sec="' + ref + '|skipped" class="fb-skipped' + (cur.v === 'skipped' ? ' on' : '') + '">' + esc(l.fbSkipped) + '</button></div></div>' +
        '<div class="fb-note"' + (cur.v === 'ok' || cur.v === 'bad' ? '' : ' hidden') + '>' +
          '<input type="text" maxlength="300" placeholder="' + esc(l.fbNotePh) + '" value="' + esc(cur.note || '') + '" data-secnote-in="' + ref + '">' +
          '<button data-secnote="' + ref + '">' + esc(l.send) + '</button></div></div>';
    }).join('') +
    '<h4>' + esc(l.fbStarsQ) + '</h4>' +
    '<div class="fb-stars" id="fbstars" role="radiogroup"><span class="fb-sl">' + esc(l.fbStar1) + '</span>' +
      [1, 2, 3, 4, 5].map((n) => '<button data-star="' + n + '" class="' + (n <= STARS ? 'on' : '') + '" aria-label="' + n + '">&#9733;</button>').join('') +
      '<span class="fb-sl">' + esc(l.fbStar5) + '</span></div>' +
    ([['reuse', l.qReuse, [['yes', l.aReuseYes], ['changes', l.aReuseChanges], ['no', l.aReuseNo]]]] as [string, string, string[][]][])
      .map(function (q) {
        return '<div class="qrow"><p class="ql">' + esc(q[1]) + '</p><div class="qpick" id="q-' + q[0] + '">' +
          q[2].map(function (o) {
            return '<button data-asp="' + q[0] + ':' + o[0] + '"' + (ASPECTS[q[0]] === o[0] ? ' class="on"' : '') +
              '>' + esc(o[1]) + '</button>';
          }).join('') + '</div></div>';
      }).join('') +
    '<h4>' + esc(l.covTitle) + '</h4><div class="covrow" id="covrow">' +
       (['all', 'part', 'none'] as const).map((k) => '<button data-cov="' + k + '"' + (COV === k ? ' class="on"' : '') + '>' +
         esc(l[{ all: 'covAll', part: 'covPart', none: 'covNone' }[k] as 'covAll']) + '</button>').join('') + '</div>' +
       '<label for="leftoff" style="display:block;font-size:13px;font-weight:600;margin:12px 0 5px">' + esc(l.leftLbl) + '</label>' +
       '<div class="noterow"><input id="leftoff" type="text" maxlength="300" placeholder="' + esc(l.leftOff) + '" value="' + esc(LEFT) + '">' +
       '<button data-leftoff>' + esc(l.send) + '</button></div>' +
       '<p class="hint" style="margin:6px 0 0">' + esc(l.leftHint) + '</p>' +
       // Drawn from what was already chosen: the page re-renders on every
       // step ticked, and a re-render must not undo the answers.
       '<div id="why"' + (ASPECTS.reuse && ASPECTS.reuse !== 'yes' ? '' : ' hidden') + '><p class="hint" style="margin:14px 0 0">' + esc(l.whyTitle) + '</p>' +
         '<div class="reasons">' + Object.keys(l.reasons).map((k) =>
           '<button data-reason="' + k + '"' + (REASONS.has(k) ? ' class="on"' : '') + '>' + esc(l.reasons[k as keyof Labels['reasons']]) + '</button>').join('') + '</div></div>' +
       '<div id="saybox"' + (ASPECTS.reuse ? '' : ' hidden') + ' class="note" style="margin-top:14px">' +
         '<label for="say">' + esc(l.commentTitle) + '</label>' +
         '<div class="noterow">' +
           '<input id="say" type="text" maxlength="400" placeholder="' + esc(l.commentPh) + '" value="' + esc(SAY) + '">' +
           '<button data-comment>' + esc(l.send) + '</button>' +
         '</div></div>' +
       '<p id="ratemsg" class="hint" style="margin-top:10px"></p></div></section>';

  $('out').innerHTML = h;
  $('barlbl').textContent = l.barLbl;
  $('fbjump').textContent = l.fbJump;
  $('bar').hidden = false;
  if (keepScroll) window.scrollTo(0, y);
}

/* ── Student sheet: what the pupils see, never the answers ─── */
let STUDENT_TXT = '';
let QUICK = false, OFFLINE = false, COV = '', LEFT = '', SAY = '';
// Teach mode is deliberately NOT remembered across visits: it is a thing you
// start when the class walks in, not a setting you live in.
let TEACH = false, TPHASE = 0;

/* ── How much is written out ─────────────────────────────
   Substitutes are not interchangeable. One is eighteen and has never stood in
   front of a class; another taught the subject for twenty years and needs the
   outline, not a script. The same plan serves both by collapsing, rather than
   being written three times — so a plan in the bank stays usable by anyone,
   and the reader can change depth mid-lesson when confidence runs out at
   minute thirty.

   The control asks how much they want written out, never what they are
   qualified to teach. Nobody should have to declare themselves untrained to a
   web page, and a question like that gets answered dishonestly anyway. The
   default is everything: the confident teacher opts up, the nervous teenager
   does nothing and is covered. */
let DEPTH = (() => { try { return localStorage.getItem('lk.depth') || 'full'; } catch { return 'full'; } })();
// Which tier the pupil sheet prints. The sheet itself never says which — a
// pupil handed "More support" at the top of the page has been told something
// about themselves that they did not ask to be told.
let STIER = 'core';

function studentParts(which: string) {
  const l = L();
  const p: Plan = (DATA && bodies(DATA)[LANG]) || {};
  let title: string | undefined, board: string | undefined, tasks: (string | undefined)[], mats: NonNullable<Plan['materials']> = [], exit = '';
  if (which === 'lesson') {
    title = p.title; board = p.board;
    tasks = (p.tasks || []).filter((x) => (x.tier || 'core') === STIER).map((x) => x.q);
    mats = p.materials || []; exit = p.exit?.q || '';
  } else {
    const x = EXTRAS.find((e) => String(e.id) === which.slice(2));
    const { body } = extraBody(x || {});
    title = body?.title; board = body?.board; tasks = (body?.tasks || []).map((q) => q.q);
  }
  const txt = [title, '', board, ''].concat(mats.map((m) => m.h + '\n' + m.body + '\n'))
    .concat(tasks.map((q, i) => (i + 1) + '. ' + q)).concat(exit ? ['', l.exit + ': ' + exit] : []).join('\n').trim();
  let h = '<h1>' + esc(title || '') + '</h1>';
  if (board) h += '<div class="bigboard">' + esc(board) + '</div>';
  mats.forEach((m) => { h += '<h2>' + esc(m.h) + '</h2><div class="mat">' + esc(m.body) + '</div>'; });
  if (tasks.length) h += '<h2>' + esc(l.tasksNow.replace(/ med facit| with answers/i, '')) + '</h2><ol>' + tasks.map((q) => '<li>' + esc(q) + '</li>').join('') + '</ol>';
  if (exit) h += '<h2>' + esc(l.exit) + '</h2><p style="font-size:19px">' + esc(exit) + '</p>';
  return { html: h, txt };
}

function openStudent(which: string) {
  const l = L();
  const { html, txt } = studentParts(which);
  STUDENT_TXT = txt;
  const p: Plan = (DATA && bodies(DATA)[LANG]) || {};
  const has = (k: string) => (p.tasks || []).some((x) => (x.tier || 'core') === k);
  const picker = which !== 'lesson' || !(has('support') || has('extension')) ? '' :
    '<span class="stier">' + esc(l.tierQ) + '</span>' +
    ([['support', l.tierSupport], ['core', l.tierStandard], ['extension', l.tierChallenge]] as const)
      .filter((x) => has(x[0]))
      .map((x) => '<button class="stbtn' + (STIER === x[0] ? ' on' : '') + '" data-stier="' + x[0] + '">' +
        esc(x[1]) + '</button>').join('');
  const h = '<div class="in"><div class="stbar noprint">' + picker +
          '<span class="stsp"></span>' +
          '<button class="stbtn" data-stprint>' + esc(l.print) + '</button>' +
          '<button class="stbtn" data-stcopy>' + esc(l.copyText) + '</button>' +
          '<button class="stbtn" data-stclose>' + esc(l.close) + '</button></div>' + html + '</div>';
  let el = document.getElementById('student');
  if (!el) { el = document.createElement('div'); el.id = 'student'; document.body.appendChild(el); }
  el.innerHTML = h; el.hidden = false; el.scrollTop = 0;
  document.body.classList.add('pst');
}
function closeStudent() {
  const el = document.getElementById('student');
  if (el) el.hidden = true;
  document.body.classList.remove('pst');
}

/* ── Events ──────────────────────────────────────────── */
// One Escape closes one layer, the top one: help sheet, pupil sheet,
// projector, then teach mode (through its own button, so it lands on the
// section that was showing).
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const sheet = maybe$('sheet');
    if (sheet && !sheet.hidden) { sheet.hidden = true; return; }
    const st = document.getElementById('student');
    if (st && !st.hidden) { closeStudent(); return; }
    const b = document.querySelector('.proj');
    if (b) { b.remove(); DECK = null; return; }
    if (TEACH && DATA) {
      const out = document.querySelector<HTMLElement>('[data-teach="0"]');
      if (out) out.click(); else { TEACH = false; render(DATA); }
      return;
    }
  }
  // While the deck is up it owns the arrow keys: someone stepping through a
  // worked example in front of a class should not have to find a button.
  if (document.querySelector('.proj') && DECK) {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault(); DI++; paintSlide(); return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault(); DI--; paintSlide(); return;
    }
    return;
  }
  if (!TEACH || !DATA) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') {
    const last = Math.max(0, ((bodies(DATA)[LANG] || {}).phases || []).length - 1);
    if (TPHASE < last) { TPHASE++; render(DATA); window.scrollTo(0, 0); }
  }
  if (e.key === 'ArrowLeft'  || e.key === 'PageUp')   { TPHASE = Math.max(0, TPHASE - 1); render(DATA); window.scrollTo(0, 0); }
});

  let DECK: Slide[] | null = null, DI = 0;

  function slideHtml(sl: Slide, i: number, n: number, l: Labels) {
    const part = sl.ph >= 0 && sl.pn
      ? '<span class="ttl">' + esc(l.projPart.replace('{i}', String(sl.ph + 1)).replace('{n}', String(sl.pn))) + '</span>' : '';
    let body: string;
    if (sl.end) {
      body = '<div class="slide endcard">' +
        '<span class="step">' + esc(l.projEnd) + '</span>' +
        '<h2>' + esc((sl.nextPh ?? -1) >= 0 ? l.projStop : l.projDone) + '</h2>' +
        ((sl.nextPh ?? -1) >= 0
          ? '<button class="nextpart" data-projpart="' + sl.nextPh + '">' + esc(l.projNextPart) + ': ' + esc(sl.nextName) + ' ›</button>'
          : '') +
        '</div>';
    } else if (sl.divider) {
      body = '<div class="slide divider"><span class="step">' +
        esc(l.projPart.replace('{i}', String(sl.ph + 1)).replace('{n}', String(sl.pn))) + '</span><h2>' + esc(sl.h) + '</h2></div>';
    } else {
      body = '<div class="slide">' +
        (sl.step ? '<span class="step">' + esc(sl.step) + '</span>' : '') +
        (sl.h ? '<h2>' + esc(sl.h) + '</h2>' : '') +
        (sl.lead ? '<p class="lead">' + esc(l.projGoal) + ': ' + esc(sl.lead) + '</p>' : '') +
        (sl.pre ? '<pre>' + esc(sl.pre) + '</pre>' : '') +
        (sl.items ? '<ol>' + sl.items.map((q) => '<li>' + esc(q) + '</li>').join('') + '</ol>' : '') +
        '</div>';
    }
    // The stop screen is not a numbered slide: the count is of what to present.
    const shown = (DECK || []).filter((x) => !x.end).length;
    return part + body +
      (sl.end ? '' : '<span class="count">' + (i + 1) + ' / ' + shown + '</span>') +
      '<button class="cl" data-projclose>' + esc(l.projHint) + '</button>' +
      '<div class="pnav">' +
        '<button data-projgo="-1"' + (i === 0 ? ' disabled' : '') + '>' + esc(l.projPrev) + '</button>' +
        '<button data-projgo="1"' + (i === n - 1 ? ' disabled' : '') + '>' + esc(l.projNext) + '</button>' +
      '</div>';
  }

  function paintSlide() {
    const box = document.querySelector('.proj');
    if (!box || !DECK || !DECK.length) return;
    DI = Math.max(0, Math.min(DI, DECK.length - 1));
    box.innerHTML = slideHtml(DECK[DI]!, DI, DECK.length, L());
  }

  /** scope: a section number shows that section alone, ending on a stop
   *  screen; 'all' shows the whole lesson with dividers. */
  function openDeck(scope: number | 'all') {
    if (!DATA) return;
    const all = bodies(DATA); const pp: Plan = all[LANG] || {};
    DECK = scope === 'all' ? deckAll(pp, L()) : deckScope(pp, L(), scope);
    if (!DECK.length) return;
    DI = 0;
    const old = document.querySelector('.proj');
    if (old) old.remove();
    const box = document.createElement('div');
    box.className = 'proj';
    document.body.appendChild(box);
    paintSlide();
  }

document.addEventListener('click', async (e) => {
  const l = L();
  const tg = e.target as HTMLElement;

  const sti = tg.closest<HTMLElement>('[data-stier]');
  if (sti) { STIER = sti.getAttribute('data-stier')!; openStudent('lesson'); return; }

  const st = tg.closest<HTMLElement>('[data-student],[data-stprint],[data-stcopy],[data-stclose]');
  if (st) {
    if (st.hasAttribute('data-student')) return openStudent(st.getAttribute('data-student')!);
    if (st.hasAttribute('data-stclose')) return closeStudent();
    if (st.hasAttribute('data-stprint')) return window.print();
    try { await navigator.clipboard.writeText(STUDENT_TXT); st.textContent = l.copiedTxt; setTimeout(() => { st.textContent = l.copyText; }, 1600); }
    catch { /* clipboard blocked */ }
    return;
  }

  // ── Progress through the lesson ────────────────────────
  const rd = tg.closest<HTMLElement>('[data-ready]');
  if (rd && DATA) { const k = rd.getAttribute('data-ready')!; PROG.ready[k] = !PROG.ready[k]; saveProg(); render(DATA, true); return; }
  const sd = tg.closest<HTMLElement>('[data-stepdone]');
  if (sd && DATA) {
    const i = Number(sd.getAttribute('data-stepdone')!);
    PROG.done[i] = true; saveProg();
    if (TEACH) {
      // One step at a time: finishing it means going to the next. After the
      // last, back to the full plan, where the feedback is.
      const cur = bodies(DATA)[LANG];
      const last = cur ? (cur.phases || []).length - 1 : i;
      if (i < last) { TPHASE = i + 1; render(DATA); window.scrollTo(0, 0); return; }
      TEACH = false; PROG.fbopen = true; saveProg(); render(DATA);
      const fb = maybe$('feedback'); if (fb) fb.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    render(DATA, true);
    const nx = document.querySelector('.ph-cur') || maybe$('feedback');
    if (nx) nx.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const sr = tg.closest<HTMLElement>('[data-stepre]');
  if (sr && DATA) { delete PROG.done[Number(sr.getAttribute('data-stepre')!)]; saveProg(); render(DATA, true); return; }
  if (tg.closest<HTMLElement>('[data-short]') && DATA) { PROG.short = !PROG.short; saveProg(); render(DATA, true); return; }
  if (tg.closest<HTMLElement>('[data-fbjump]')) {
    PROG.fbopen = true;
    const bd = document.querySelector<HTMLElement>('#feedback .fb-body'); if (bd) bd.hidden = false;
    const tg = document.querySelector('#feedback [data-fbtoggle]'); if (tg) tg.setAttribute('aria-expanded', 'true');
    const f = maybe$('feedback'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
  }

  // ── Per-step feedback ──────────────────────────────────
  const sb1 = tg.closest<HTMLElement>('[data-sec]');
  if (sb1) {
    const [ref = '', verdict = ''] = sb1.getAttribute('data-sec')!.split('|');
    const idx = Number(ref.split(':')[1]);
    const label = ((DATA && bodies(DATA)[LANG] || {}).phases || [])[idx]?.n || ref;
    PROG.sec[ref] = Object.assign({}, PROG.sec[ref], { v: verdict }); saveProg();
    const row = sb1.closest<HTMLElement>('[data-fbrow]')!;
    [...row.querySelectorAll('[data-sec]')].forEach((b) => b.classList.toggle('on', b === sb1));
    row.querySelector<HTMLElement>('.fb-note')!.hidden = !(verdict === 'ok' || verdict === 'bad');
    const { error } = await sb.rpc('lk_rate_section_by_token', {
      p_token: token, p_session: SESSION, p_ref: ref, p_label: label, p_verdict: verdict, p_note: null,
    });
    $('ratemsg').textContent = error ? l.saveFail + error.message : '';
    return;
  }
  const stb = tg.closest<HTMLElement>('[data-star]');
  if (stb) {
    const n = Number(stb.getAttribute('data-star')!);
    PROG.stars = n; saveProg();
    [...document.querySelectorAll('#fbstars [data-star]')].forEach((b) => b.classList.toggle('on', Number(b.getAttribute('data-star')!) <= n));
    const { error } = await sb.rpc('lk_rate_stars_by_token', { p_token: token, p_session: SESSION, p_stars: n });
    $('ratemsg').textContent = error ? l.saveFail + error.message : l.thanks;
    return;
  }
  const ftg = tg.closest<HTMLElement>('[data-fbtoggle]');
  if (ftg) {
    PROG.fbopen = !PROG.fbopen;
    ftg.setAttribute('aria-expanded', PROG.fbopen ? 'true' : 'false');
    const bd = document.querySelector<HTMLElement>('#feedback .fb-body'); if (bd) bd.hidden = !PROG.fbopen;
    return;
  }
  const sn = tg.closest<HTMLElement>('[data-secnote]');
  if (sn) {
    const ref = sn.getAttribute('data-secnote')!;
    const inp = document.querySelector<HTMLInputElement>('[data-secnote-in="' + ref + '"]');
    const val = (inp?.value || '').trim();
    if (!val) return;
    const idx = Number(ref.split(':')[1]);
    const label = ((DATA && bodies(DATA)[LANG] || {}).phases || [])[idx]?.n || ref;
    PROG.sec[ref] = Object.assign({}, PROG.sec[ref], { note: val }); saveProg();
    const { error } = await sb.rpc('lk_rate_section_by_token', {
      p_token: token, p_session: SESSION, p_ref: ref, p_label: label, p_verdict: PROG.sec[ref].v || 'ok', p_note: val,
    });
    sn.textContent = error ? '!' : l.fbSavedS;
    return;
  }

  const qk = tg.closest<HTMLElement>('[data-quick]');
  if (qk && DATA) { QUICK = qk.getAttribute('data-quick') === '1'; render(DATA); window.scrollTo(0, 0); return; }

  const tm = tg.closest<HTMLElement>('[data-teach]');
  if (tm && DATA) {
    TEACH = tm.getAttribute('data-teach') === '1';
    if (TEACH) TPHASE = 0;
    render(DATA); window.scrollTo(0, 0); return;
  }

  const tp = tg.closest<HTMLElement>('[data-tph]');
  if (tp && DATA) {
    TPHASE = parseInt(tp.getAttribute('data-tph')!, 10) || 0;
    render(DATA); window.scrollTo(0, 0); return;
  }

  // A phase's own button opens the deck at that phase rather than a
  // standalone card, so moving on does not mean closing and hunting.
  const pj = tg.closest<HTMLElement>('[data-proj]');
  if (pj && DATA) {
    openDeck(parseInt(pj.getAttribute('data-proj')!, 10) || 0);
    return;
  }
  const pnx = tg.closest<HTMLElement>('[data-projpart]');
  if (pnx && DATA) { openDeck(parseInt(pnx.getAttribute('data-projpart')!, 10) || 0); return; }
  if (tg.closest<HTMLElement>('[data-projdeck]') && DATA) { openDeck('all'); return; }
  const pg = tg.closest<HTMLElement>('[data-projgo]');
  if (pg) { DI += parseInt(pg.getAttribute('data-projgo')!, 10); paintSlide(); return; }
  if (tg.closest<HTMLElement>('[data-projclose]')) {
    const b = document.querySelector('.proj'); if (b) b.remove();
    // Land on the section the class was last shown, not where the page was
    // before the projector opened.
    const cs = DECK && DECK[DI];
    DECK = null;
    if (cs && typeof cs.ph === 'number' && cs.ph >= 0 && DATA) {
      if (TEACH) { TPHASE = cs.ph; render(DATA); window.scrollTo(0, 0); }
      else { const t = document.getElementById('ph' + cs.ph); if (t) t.scrollIntoView({ block: 'start' }); }
    }
    return;
  }


  const dp = tg.closest<HTMLElement>('[data-depth]');
  if (dp && DATA) {
    DEPTH = dp.getAttribute('data-depth')!;
    try { localStorage.setItem('lk.depth', DEPTH); } catch { /* private window */ }
    render(DATA, true);
    return;
  }
  if (tg.closest<HTMLElement>('[data-pack]')) { window.print(); return; }

  const tv = tg.closest<HTMLElement>('[data-tv]');
  const tn = tg.closest<HTMLElement>('[data-tnote]');
  if (tv || tn) {
    const verdict = tv ? tv.getAttribute('data-tv')! : null;
    if (tv) [...$('tverdict').children].forEach((x) => x.classList.toggle('on', x === tv));
    const { error } = await sb.rpc('lk_teacher_verdict', {
      p_token: token, p_verdict: verdict, p_note: tn ? $<HTMLInputElement>('tnote').value.trim() : null,
    });
    $('tmsg').textContent = error ? L().saveFail + error.message : L().tThanks;
    return;
  }

  const lcov = tg.closest<HTMLElement>('[data-lcov]');
  const lleft = tg.closest<HTMLElement>('[data-lleft]');
  if (lcov || lleft) {
    if (lcov) {
      COV = lcov.getAttribute('data-lcov')!;
      [...$('covrow').children].forEach((b) => b.classList.toggle('on', b === lcov));
    }
    if (lleft) LEFT = $<HTMLInputElement>('leftoff').value.trim();
    const { error } = await sb.rpc('lk_linked_coverage', { p_token: token, p_coverage: COV || null, p_left_off: LEFT || null });
    $('lratemsg').textContent = error ? L().saveFail + error.message : L().thanks;
    return;
  }
  const asp = tg.closest<HTMLElement>('[data-asp]');
  if (asp) {
    const parts = asp.getAttribute('data-asp')!.split(':');
    ASPECTS[parts[0]!] = parts[1]!;
    [...$('q-' + parts[0]).children].forEach((x) => x.classList.toggle('on', x === asp));
    // "No" and "with changes" are the answers worth a reason, so ask then.
    if (parts[0] === 'reuse') {
      $('why').hidden = parts[1] === 'yes';
      $('saybox').hidden = false;
    }
    const { error } = await sb.rpc('lk_rate_aspects_by_token', {
      p_token: token, p_session: SESSION, p_reuse: ASPECTS.reuse || null,
      p_clarity: ASPECTS.clarity || null, p_timefit: ASPECTS.timefit || null,
    });
    const done = !!ASPECTS.reuse;
    $('ratemsg').textContent = error ? L().saveFail + error.message : (done ? L().thanks : L().savedSoFar);
    return;
  }
  const cov = tg.closest<HTMLElement>('[data-cov]');
  const lo = tg.closest<HTMLElement>('[data-leftoff]');
  if (cov || lo) {
    if (cov) {
      COV = cov.getAttribute('data-cov')!;
      document.querySelectorAll('#covrow button').forEach((b) => b.classList.toggle('on', b === cov));
    }
    LEFT = maybe$<HTMLInputElement>('leftoff')?.value || '';
    if (!COV) { $('ratemsg').textContent = l.pickCovFirst; return; }
    const { error } = await sb.rpc('lk_rate_coverage_by_token', { p_token: token, p_coverage: COV, p_left_off: LEFT });
    $('ratemsg').textContent = error ? l.saveFail + error.message : l.thanks;
    return;
  }
  const pick = tg.closest<HTMLElement>('[data-pick]');
  if (pick && DATA) {
    LANG = pick.getAttribute('data-pick') as Lang;
    try { localStorage.setItem('lk.lang', LANG); } catch { /* private window */ }
    render(DATA);
    window.scrollTo(0, 0);
    return;
  }

  const a = tg.closest<HTMLElement>('[data-assist]');
  if (a) {
    return runAssist({
      kind: a.getAttribute('data-assist')!,
      ref: a.getAttribute('data-ref')!,
      label: a.getAttribute('data-label')!,
      variant: a.getAttribute('data-variant') || '',
      text: a.closest<HTMLElement>('.phase, .ps')?.innerText?.slice(0, 1200) || '',
    });
  }

  if (tg.closest<HTMLElement>('[data-assistnew]') && LASTASSIST) {
    return runAssist(Object.assign({}, LASTASSIST, { fresh: true }));
  }

  const fill = tg.closest<HTMLElement>('[data-fill]');
  if (fill) {
    return runAssist({
      kind: 'filler', ref: 'lesson', label: l.barLbl,
      minutes: Number(fill.getAttribute('data-fill')!),
    });
  }

  if (tg.closest<HTMLElement>('[data-sheetclose]') || tg.id === 'sheet') {
    $('sheet').hidden = true;
    return;
  }

  const xv = tg.closest<HTMLButtonElement>('[data-xv]');
  if (xv) {
    const [id, up] = xv.getAttribute('data-xv')!.split(':');
    document.querySelectorAll<HTMLButtonElement>('[data-xv]').forEach((b) => { b.disabled = true; b.classList.toggle('on', b === xv); });
    const { error } = await sb.rpc('lk_extra_verdict_by_token', { p_token: token, p_extra_id: Number(id), p_up: up === '1' });
    const m = maybe$('xvmsg'); if (m) m.textContent = error ? '' : l.xvThanks;
    return;
  }

  const noteBtn = tg.closest<HTMLButtonElement>('[data-note]');
  if (noteBtn) {
    const val = maybe$<HTMLInputElement>('noteq')?.value || '';
    if (!val.trim()) return;
    noteBtn.disabled = true;
    const { data, error } = await sb.rpc('lk_extra_note', {
      p_token: token, p_extra_id: Number(noteBtn.getAttribute('data-note')!), p_note: val,
    });
    $('notemsg').textContent = (error || !data) ? l.saveFail + (error?.message || '') : l.noteSaved;
    return;
  }

  const sayBtn = tg.closest<HTMLButtonElement>('[data-comment]');
  if (sayBtn) {
    const val = maybe$<HTMLInputElement>('say')?.value || '';
    if (!val.trim()) return;
    SAY = val;
    sayBtn.disabled = true;
    const { error } = await sb.rpc('lk_rate_comment_by_token', { p_token: token, p_comment: val });
    $('ratemsg').textContent = error ? l.saveFail + error.message : l.thanks;
    return;
  }

  const reason = tg.closest<HTMLElement>('[data-reason]');
  if (reason) {
    const k = reason.getAttribute('data-reason')!;
    if (REASONS.has(k)) { REASONS.delete(k); reason.classList.remove('on'); }
    else { REASONS.add(k); reason.classList.add('on'); }
    const { error } = await sb.rpc('lk_rate_reasons_by_token', {
      p_token: token, p_reasons: [...REASONS],
    });
    $('ratemsg').textContent = error ? l.saveFail + error.message : l.thanks;
    return;
  }

});

load();
export {};

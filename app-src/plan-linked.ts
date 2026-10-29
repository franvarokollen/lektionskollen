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
import { Plan } from './types';
import { $, L, LinkedInfo, P, esc } from './plan-core';
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

export function renderLinked(d: LinkedInfo) {
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

export function runDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString(P.LANG === 'sv' ? 'sv-SE' : 'en-GB',
    { weekday: 'short', day: 'numeric', month: 'short' });
}

/* Minutes to add so the plan's own clock (e.g. 00:30-00:52) reads as the real
   lesson time (13:30-13:52). Only class links know the real start. */
export function shiftT(tt: string | undefined, sh: number) {
  if (!sh || !tt) return tt;
  return String(tt).replace(/(\d{1,2}):(\d{2})/g, (_m, h: string, mi: string) => {
    const v = (((+h * 60 + +mi + sh) % 1440) + 1440) % 1440;
    return ('0' + Math.floor(v / 60)).slice(-2) + ':' + ('0' + (v % 60)).slice(-2);
  });
}
export function clockShift(p: Plan) {
  const m = P.RUN && P.RUN.lesson_time && String(P.RUN.lesson_time).match(/(\d{1,2}):(\d{2})/);
  const f = p && (p.phases || [])[0] && String(p.phases![0]!.t || '').match(/(\d{1,2}):(\d{2})/);
  if (!m || !f) return 0;
  return (+m[1]! * 60 + +m[2]!) - (+f[1]! * 60 + +f[2]!);
}

/* Which class this is for, and until when the link works. Shown above the
   title so a substitute with two classes on one plan sees at a glance which
   link they are holding. */
export function runBand() {
  if (!P.RUN) return '';
  const l = L();
  const until = P.RUN.expires_at ? new Date(P.RUN.expires_at) : null;
  return '<div class="runband"><b>' + esc(P.RUN.group_name) + '</b>' +
    (P.RUN.lesson_time ? ' · ' + esc(P.RUN.lesson_time) : '') +
    ' · ' + esc(runDate(P.RUN.used_on)) +
    (P.RUN.substitute ? ' · ' + esc(P.RUN.substitute) : '') +
    (until ? '<span class="until">' + esc(l.runUntil) + ' ' + esc(runDate(new Date(until.getTime() - 1000).toISOString().slice(0, 10))) + '</span>' : '') +
    '</div>';
}

/* ── Render ──────────────────────────────────────────── */
import { RenderOpts } from './plan-view';
import { bodies } from './plan-load';
import { assistRow } from './plan-assist';
import { clockShift, runBand, shiftT } from './plan-linked';
import { Labels } from './plan-labels';
import { $, ASPECTS, L, Lang, P, PROG, PlanRow, esc } from './plan-core';
import { studentParts } from './plan-depth';
export function render(d: PlanRow, keepScroll?: boolean) {
  const y = keepScroll ? window.scrollY : 0;
  P.DATA = d;
  const all = bodies(d);
  if (!all[P.LANG]) P.LANG = (d.language || Object.keys(all)[0]) as Lang;
  const p = all[P.LANG] || {};
  const choices = Object.keys(all);
  const l = L();

  if (P.QUICK) {
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
    depth: P.DEPTH as 'full' | 'guided' | 'brief',
    assistRow: (ref: string, name?: string) => assistRow(ref, name),
    projector: true,
    shiftMin: clockShift(p),
    help: false,                       // lifted into the margin rail below
    interactive: true,
    ready: PROG.ready, done: PROG.done, short: PROG.short,
  };

  // ── Teach mode: one phase, nothing else ──────────────────
  // A substitute mid-lesson is not reading, they are performing.
  if (P.TEACH) {
    const i = Math.max(0, Math.min(P.TPHASE, phases.length - 1));
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
    (P.OFFLINE ? '<div class="offl noprint">' + esc(l.offlineNote) + '</div>' : '') +
    '<div class="subhead">' + runBand() + '<div class="subhead-row"><div>' +
    '<h1>' + esc(p.title) + '</h1>' +
    '<div class="m">' + esc(d.subject) + ' · ' + esc(d.year_group) + ' · ' + d.minutes + ' min · ' + esc(d.school) + '</div>' +
    '</div>' +
    (choices.length > 1
      ? '<div class="langpick noprint">' + choices.map((c) =>
          '<button data-pick="' + c + '"' + (c === P.LANG ? ' class="on"' : '') + '>' + (c === 'sv' ? 'SV' : 'EN') + '</button>').join('') + '</div>'
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
      '<button data-depth="' + x[0] + '"' + (P.DEPTH === x[0] ? ' class="on"' : '') + '>' + esc(x[1]) + '</button>').join('') +
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
       (['all', 'part', 'none'] as const).map((k) => '<button data-cov="' + k + '"' + (P.COV === k ? ' class="on"' : '') + '>' +
         esc(l[{ all: 'covAll', part: 'covPart', none: 'covNone' }[k] as 'covAll']) + '</button>').join('') + '</div>' +
       '<label for="leftoff" style="display:block;font-size:13px;font-weight:600;margin:12px 0 5px">' + esc(l.leftLbl) + '</label>' +
       '<div class="noterow"><input id="leftoff" type="text" maxlength="300" placeholder="' + esc(l.leftOff) + '" value="' + esc(P.LEFT) + '">' +
       '<button data-leftoff>' + esc(l.send) + '</button></div>' +
       '<p class="hint" style="margin:6px 0 0">' + esc(l.leftHint) + '</p>' +
       // Drawn from what was already chosen: the page re-renders on every
       // step ticked, and a re-render must not undo the answers.
       '<div id="why"' + (ASPECTS.reuse && ASPECTS.reuse !== 'yes' ? '' : ' hidden') + '><p class="hint" style="margin:14px 0 0">' + esc(l.whyTitle) + '</p>' +
         '<div class="reasons">' + Object.keys(l.reasons).map((k) =>
           '<button data-reason="' + k + '"' + (P.REASONS.has(k) ? ' class="on"' : '') + '>' + esc(l.reasons[k as keyof Labels['reasons']]) + '</button>').join('') + '</div></div>' +
       '<div id="saybox"' + (ASPECTS.reuse ? '' : ' hidden') + ' class="note" style="margin-top:14px">' +
         '<label for="say">' + esc(l.commentTitle) + '</label>' +
         '<div class="noterow">' +
           '<input id="say" type="text" maxlength="400" placeholder="' + esc(l.commentPh) + '" value="' + esc(P.SAY) + '">' +
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

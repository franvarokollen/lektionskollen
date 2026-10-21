// The plan, rendered once.
//
// There used to be two of these: the substitute's own page built one layout and
// vikarieView() in lk.js built another. They started the same and drifted, and
// the one that drifted was the one people actually looked at — the preview in
// the coordinator app, which is also what the FVK iframe renders. A plan was
// rebuilt around worked examples and misconceptions and the preview went on
// showing the old flat list of sections, with no sign that anything was stale.
//
// So there is one renderer and one stylesheet now. The two hosts differ only in
// what they wrap it in and what they hook into it.
//
//   render(plan, opts) -> html
//     opts.lbl(key)    required. Looks up a label. The hosts have different
//                      i18n systems, so this is the whole of the coupling.
//     opts.depth       'full' | 'guided' | 'brief'. Default 'full'.
//                      Collapsing happens here, at read time, never at
//                      generation — one banked plan serves every substitute.
//                      Answers survive every depth: brief hides the script,
//                      never a fact.
//     opts.assistRow   (ref, label) -> html, for the live-assist buttons.
//     opts.extras      (ref) -> html, for anything generated mid-lesson.
//     opts.flag        (ref) -> html, for the coordinator's feedback heat.
//     opts.projector   true to offer "show this to the class" per phase.
//     opts.help        false to leave out the help register (the host puts it
//                      in a margin rail instead).
//     opts.only        render just this phase index, and nothing else. Teach
//                      mode shows one phase at a time, and a phase has to keep
//                      its real index: phase 2 draws the worked example and
//                      phase 4 the task list.
(function (root) {
  'use strict';

  var esc = function (s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  // Phase order is the lesson's own sequence, so the colour is not decoration:
  // recap, worked example, one together, independent, exit.
  var KINDS = ['k-recall', 'k-model', 'k-together', 'k-indep', 'k-exit'];
  var kind = function (i) { return KINDS[i] || 'k-indep'; };

  function render(p, o) {
    p = p || {};
    o = o || {};
    var t = o.lbl || function (k) { return k; };
    var depth = o.depth || 'full';
    var assistRow = o.assistRow || function () { return ''; };
    var extras = o.extras || function () { return ''; };
    var flag = o.flag || function () { return ''; };
    var phases = p.phases || [];

    // A question and its answer, side by side. Separating them is the
    // split-attention effect: the reader holds one in working memory while
    // hunting for the other, and mid-lesson that is a scroll they cannot
    // afford. They used to be in different sections.
    function qa(q, a, num) {
      if (!q) return '';
      return '<div class="qa' + (num ? ' num' : '') + '">' +
        '<div class="q">' + esc(q) + '</div>' +
        '<div class="a"><b>' + esc(t('answer')) + '</b>' + esc(a || '') + '</div></div>';
    }

    // Double planning, made visible: what goes on the board and what to say
    // while writing it, so a substitute with no subject knowledge needs to
    // invent neither half.
    function modelBlock(m) {
      if (!m || !m.p) return '';
      return '<div class="model"><div class="model-p">' + esc(m.p) + '</div>' +
        '<div class="model-st model-lbl"><span>' + esc(t('modelWrite')) + '</span>' +
        '<span>' + esc(t('modelSay')) + '</span></div>' +
        (m.st || []).map(function (st) {
          return '<div class="model-st"><div class="model-b">' + esc(st.b || '') + '</div>' +
            '<div class="model-s">' + esc(st.s || '') + '</div></div>';
        }).join('') +
        '<div class="model-a">' + esc(t('modelAns')) + ': ' + esc(m.a || '') + '</div></div>';
    }


    // ── The three tiers, all on the page at once ───────────
    // The form used to ask the coordinator to pick one difficulty for the whole
    // class, in words ("Adapted", "Stretch") that mean nothing outside a
    // staffroom. Thirty pupils need three levels at the same moment, and the
    // person who can tell which pupil needs which is the one standing in the
    // room. So all three are here, each with its answers, and the substitute
    // points a pupil at the right one.
    //
    // The tier names are for the adult. A pupil's sheet never carries one.
    function tiers(tasks) {
      var order = ['support', 'core', 'extension'];
      var names = { support: 'tierSupport', core: 'tierStandard', extension: 'tierChallenge' };
      var groups = order.map(function (k) {
        return { k: k, items: tasks.filter(function (x) { return (x.tier || 'core') === k; }) };
      }).filter(function (g) { return g.items.length; });
      if (!groups.length) return '';
      // One tier and no labels is the honest rendering of an untiered plan:
      // naming a level implies the others exist somewhere.
      if (groups.length === 1) {
        return '<div class="qalist">' +
          groups[0].items.map(function (x) { return qa(x.q, x.a, true); }).join('') + '</div>';
      }
      return '<div class="tiers">' + groups.map(function (g) {
        return '<div class="tier t-' + g.k + '"><h5>' + esc(t(names[g.k])) + '</h5>' +
          '<div class="qalist">' +
          g.items.map(function (x) { return qa(x.q, x.a, true); }).join('') + '</div></div>';
      }).join('') + '</div>' +
      '<p class="hint" style="margin:8px 0 0">' + esc(t('tierHint')) + '</p>';
    }

    function phaseCard(ph, i) {
      var ref = 'phase:' + i;
      var isModel = i === 1;
      return '<div class="ph ' + kind(i) + '" id="ph' + i + '">' +
        '<div class="ph-h"><span class="ph-n">' + (i + 1) + '</span>' +
        '<strong>' + esc(ph.n) + '</strong>' + flag(ref) +
        '<span class="ph-t">' + esc(ph.t) + '</span></div>' +
        (depth === 'full' && ph.say
          ? '<div class="say"><em>' + esc(t('say')) + '</em>' + esc(ph.say) + '</div>' : '') +
        (isModel ? modelBlock(p.model) : '') +
        (i === 0 && p.recall && p.recall.why
          ? '<p class="meta"><b>' + esc(t('recallWhy')) + ':</b> ' + esc(p.recall.why) + '</p>' : '') +
        // The worked example already prints its own problem and answer; printing
        // the phase's check as well said the same thing twice.
        (isModel ? '' : (ph.checks || []).map(function (c) { return qa(c.q, c.a); }).join('')) +
        (i === 3 ? tiers(p.tasks || []) : '') +
        (depth !== 'brief' && ph.pupils
          ? '<p class="meta"><b>' + esc(t('pupils')) + '</b> ' + esc(ph.pupils) + '</p>' : '') +
        (depth === 'full' && ph.expect && ph.expect !== '—'
          ? '<p class="meta"><b>' + esc(t('expect')) + '</b> ' + esc(ph.expect) + '</p>' : '') +
        (o.projector && ph.board
          ? '<div class="strow noprint" style="margin-top:9px">' +
            '<button class="stbtn" data-proj="' + i + '">' + esc(t('projBtn')) + '</button></div>' : '') +
        assistRow(ref, ph.n) + extras(ref) + '</div>';
    }

    if (typeof o.only === 'number') {
      var pick = phases[Math.max(0, Math.min(o.only, phases.length - 1))];
      return pick ? phaseCard(pick, o.only) : '';
    }

    var h = '';

    // ── 1. Before the bell ─────────────────────────────────
    h += '<section class="reg reg-before">' +
      '<div class="reg-h"><span class="n">1</span>' + esc(t('beforeBell')) + '</div>' +
      (depth !== 'brief' && (p.first90 || []).length
        ? '<ul style="margin:0 0 12px;padding-left:18px;font-size:13.5px">' +
          p.first90.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      '<p style="font-size:13.5px;margin-bottom:10px">' + esc(p.summary) + '</p>' +
      '<p style="font-size:13px;margin-bottom:12px"><b>' + esc(t('goal')) + '</b> ' + esc(p.goal) + '</p>' +
      '<div class="board">' + esc(p.board) + '</div>' +
      '<p style="margin-top:10px;font-size:13px"><b>' + esc(t('need')) + '</b> ' +
        esc(p.equipment && p.equipment.need) +
      '<br><span style="color:var(--ink-soft)">' + esc(p.equipment && p.equipment.fallback) +
      '</span></p></section>';

    // ── 2. The lesson ──────────────────────────────────────
    h += '<div class="lesson-h"><h2>' + esc(t('theLesson')) + '</h2></div>' +
      phases.map(phaseCard).join('');

    if ((p.misconceptions || []).length) {
      h += '<section class="reg reg-plain">' +
        '<div class="reg-h reg-h-misc"><span class="n">!</span>' + esc(t('miscH')) + '</div>' +
        p.misconceptions.map(function (m) {
          return '<div class="misc"><div class="t">' + esc(m.t) + '</div>' +
            (m.w ? '<div class="w">' + esc(t('miscWhy')) + ': ' + esc(m.w) + '</div>' : '') +
            '<div class="s"><b>' + esc(t('miscSay')) + '</b>' + esc(m.s) + '</div></div>';
        }).join('') + '</section>';
    }

    if ((p.materials || []).length) {
      h += '<section class="reg reg-plain">' +
        '<div class="reg-h"><span class="n">&#9638;</span>' + esc(t('handouts')) + '</div>' +
        p.materials.map(function (m) {
          return '<div class="mat"><h5>' + esc(m.h) + '</h5><div>' + esc(m.body) + '</div></div>';
        }).join('') +
        assistRow('tasks', t('tasks')) + extras('tasks') + '</section>';
    }

    // ── 3. Help ────────────────────────────────────────────
    // Last in the markup, but the hosts that can spare the width lift it into a
    // margin rail: it is needed at the moment there is no time to scroll.
    if (o.help !== false) h += helpRegister(p, t);

    return h;
  }

  // Split out so a host can place it in a rail instead of in the flow.
  function helpRegister(p, t) {
    return '<section class="reg reg-help">' +
      '<div class="reg-h"><span class="n">?</span>' + esc(t('ifWrong')) + '</div>' +
      '<div class="callout"><strong>' + esc(t('stuck')) + '</strong>' + esc(p.stuck) + '</div>' +
      '<div class="callout"><strong>' + esc(t('ahead')) + '</strong>' + esc(p.ahead) + '</div>' +
      '<div class="callout"><strong>' + esc(t('wrong')) + '</strong>' + esc(p.wrong) + '</div></section>' +
      (p.equipment && p.equipment.where
        ? '<div class="nav where" style="margin-top:14px"><b>' + esc(t('whereH')) + '</b>' +
          esc(p.equipment.where) + '</div>' : '');
  }

  // The closing sections. Separate because the two hosts follow them with
  // different things — ratings on the substitute's page, controls in the app.
  function afterRegister(p, t, extras) {
    return '<section class="reg reg-after">' +
      '<div class="reg-h"><span class="n">4</span>' + esc(t('afterH')) + '</div>' +
      '<p style="font-size:13px;white-space:pre-wrap">' + esc(p.handover) + '</p>' +
      (extras ? extras('lesson') : '') + '</section>';
  }

  root.LKPlan = { render: render, help: helpRegister, after: afterRegister, esc: esc, kind: kind };
})(typeof window !== 'undefined' ? window : globalThis);

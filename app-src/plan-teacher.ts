// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
/* ── What the class teacher sees ─────────────────────────
   They are the only person in the chain who can tell whether the content was
   correct and whether it suited this particular class. The coordinator cannot
   — they are not a chemist — and the substitute can only report whether it was
   deliverable, which is a different question entirely.

   Kept to three taps and one optional line, because this is read between
   lessons by someone who has just come back from being ill. The plan itself is
   below the question so they can check it, but the question comes first. */
import { Plan } from './types';
import { $, L, P, TeacherView, esc } from './plan-core';
export function renderTeacher(d: TeacherView) {
  const l = L();
  const all: Record<string, Plan> = { [d.language || 'sv']: d.body };
  if (d.body_alt && d.language_alt) all[d.language_alt] = d.body_alt;
  const p: Plan = all[P.LANG] || all[d.language || 'sv'] || {};
  const said = d.substitute_said || [];
  const covText: Record<string, string> = { all: l.covAll, part: l.covPart, none: l.covNone };

  $('out').innerHTML =
    '<div class="card">' +
      '<span class="kicker">' + esc(l.tKicker) + '</span>' +
      '<h1>' + esc(p.title || d.title) + '</h1>' +
      '<p class="muted">' + esc(d.group_name) + ' · ' +
        esc(new Date(d.used_on).toLocaleDateString(P.LANG === 'sv' ? 'sv-SE' : 'en-GB',
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

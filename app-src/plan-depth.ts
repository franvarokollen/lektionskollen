// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
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
import { extraBody } from './plan-assist';
import { bodies } from './plan-load';
import { Plan } from './types';
import { L, P, esc } from './plan-core';

export function studentParts(which: string) {
  const l = L();
  const p: Plan = (P.DATA && bodies(P.DATA)[P.LANG]) || {};
  let title: string | undefined, board: string | undefined, tasks: (string | undefined)[], mats: NonNullable<Plan['materials']> = [], exit = '';
  if (which === 'lesson') {
    title = p.title; board = p.board;
    tasks = (p.tasks || []).filter((x) => (x.tier || 'core') === P.STIER).map((x) => x.q);
    mats = p.materials || []; exit = p.exit?.q || '';
  } else {
    const x = P.EXTRAS.find((e) => String(e.id) === which.slice(2));
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

export function openStudent(which: string) {
  const l = L();
  const { html, txt } = studentParts(which);
  P.STUDENT_TXT = txt;
  const p: Plan = (P.DATA && bodies(P.DATA)[P.LANG]) || {};
  const has = (k: string) => (p.tasks || []).some((x) => (x.tier || 'core') === k);
  const picker = which !== 'lesson' || !(has('support') || has('extension')) ? '' :
    '<span class="stier">' + esc(l.tierQ) + '</span>' +
    ([['support', l.tierSupport], ['core', l.tierStandard], ['extension', l.tierChallenge]] as const)
      .filter((x) => has(x[0]))
      .map((x) => '<button class="stbtn' + (P.STIER === x[0] ? ' on' : '') + '" data-stier="' + x[0] + '">' +
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
export function closeStudent() {
  const el = document.getElementById('student');
  if (el) el.hidden = true;
  document.body.classList.remove('pst');
}

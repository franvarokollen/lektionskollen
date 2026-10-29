/* ── Cover today (Lektionskollen on its own) ─────────────
   The lessons that need a substitute today, and for each one whether the
   substitute has something to teach from. Inside Frånvarokollen this list is
   FVK's own cover table; on its own, LK keeps it: sample lessons for the
   demo, plus any the coordinator adds. When the school links LK to FVK, the
   list fills itself from FVK and the add form is no longer needed.

   Lessons added here are kept in this browser for the day. They use the same
   lesson id as everything else (the cover plan, the generated plan, the link
   to the teacher's own plan), so every action on a lesson works the same as
   it does from FVK's cover table. */
import { CATALOG_SUBJECTS, CATALOG_YEARS, subjectLabel, yearLabel } from './lk-catalog';
import { LANG, Row, esc, fillT, maybe$, t, toast } from './lk-core';
import { ROWS, planFor } from './lk-cover';
import { planRow, openPlanPanel } from './lk-link';

const KEY = 'lk.today';
const dayKey = () => new Date().toISOString().slice(0, 10);
let formOpen = false;

/** Lessons the coordinator added today, from this browser. Yesterday's are dropped. */
function loadOwn(): Row[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}') as { day?: string; rows?: Row[] };
    return v.day === dayKey() && Array.isArray(v.rows) ? v.rows : [];
  } catch { return []; }
}
function saveOwn(rows: Row[]) {
  try { localStorage.setItem(KEY, JSON.stringify({ day: dayKey(), rows })); } catch { /* private window */ }
}

/** Put today's own lessons into the shared lesson list, once. */
export function loadTodayRows() {
  for (const r of loadOwn()) if (!ROWS.some((x) => x.id === r.id)) ROWS.push(r);
}

const isOwn = (r: Row) => r.id.startsWith('own-');
const lessons = () => ROWS.filter((r) => r.plannable).sort((a, b) => a.start.localeCompare(b.start));

/** One word for where the lesson stands. */
function status(r: Row): [string, string] {
  const p = planFor(r.id);
  if (!p) return ['warn', t('tdNeeds')];
  if (p.kind === 'not_needed') return ['neutral', t('tdNotNeeded')];
  if (p.kind === 'generated') return p.approved ? ['ok', t('tdReady')] : ['draft', t('tdDraft')];
  return ['ok', t('tdTeacherOwn')];
}

function lessonCard(r: Row) {
  const [cls, word] = status(r);
  const what = [r.group, subjectLabel(r.subject), yearLabel(r.year)].filter(Boolean).join(' · ');
  return '<article class="tdcard">' +
    '<div class="tdtime mono">' + esc(r.start) + '<span>' + esc(r.end) + '</span></div>' +
    '<div class="tdmain">' +
      '<div class="tdtop"><b>' + esc(what) + '</b><span class="tdst ' + cls + '">' + esc(word) + '</span></div>' +
      '<p class="tdmeta">' + [
        r.room ? esc(r.room) : '',
        r.teacher ? esc(t('tdFor')) + ' ' + esc(r.teacher) : '',
        r.cover ? '<span class="covpill">✓ ' + esc(r.cover) + '</span>' : '<span class="tdnosub">' + esc(t('tdNoSub')) + '</span>',
        isOwn(r) ? '<span class="tdown">' + esc(t('tdOwn')) + '</span>' : '',
      ].filter(Boolean).join(' · ') + '</p>' +
      '<div class="tdplan">' + planRow(r, planFor(r.id)) + '</div>' +
    '</div>' +
    (isOwn(r) ? '<button class="x tdremove" data-tdremove="' + esc(r.id) + '" title="' + esc(t('tdRemove')) + '" aria-label="' + esc(t('tdRemove')) + '">✕</button>' : '') +
  '</article>';
}

function addForm() {
  const opt = (v: string, lbl: string, on = false) => '<option value="' + esc(v) + '"' + (on ? ' selected' : '') + '>' + esc(lbl) + '</option>';
  return '<div class="bcard fx tdform">' +
    '<h3>' + esc(t('tdAddTitle')) + '</h3>' +
    '<div class="tdgrid">' +
      '<label class="f">' + esc(t('tdSubject')) + '<select id="td-subject">' + CATALOG_SUBJECTS.map((s) => opt(s, subjectLabel(s))).join('') + '</select></label>' +
      '<label class="f">' + esc(t('tdYear')) + '<select id="td-year">' + CATALOG_YEARS.map((y) => opt(y, yearLabel(y), y === 'Åk 7')).join('') + '</select></label>' +
      '<label class="f">' + esc(t('tdClass')) + '<input id="td-class" maxlength="40" placeholder="7B"></label>' +
      '<label class="f">' + esc(t('tdStart')) + '<input id="td-start" type="time" value="08:20"></label>' +
      '<label class="f">' + esc(t('tdEnd')) + '<input id="td-end" type="time" value="09:20"></label>' +
      '<label class="f">' + esc(t('tdRoom')) + '<input id="td-room" maxlength="40"></label>' +
      '<label class="f">' + esc(t('tdTeacher')) + '<input id="td-teacher" maxlength="80"></label>' +
      '<label class="f">' + esc(t('tdSub')) + '<input id="td-sub" maxlength="80"></label>' +
    '</div>' +
    '<div class="foot"><span class="spacer"></span>' +
      '<button class="btn btn-ghost" data-tdcancel>' + esc(t('cancel')) + '</button>' +
      '<button class="btn btn-primary" data-tdsave>' + esc(t('tdSave')) + '</button></div>' +
  '</div>';
}

export function renderToday() {
  const host = maybe$('today-page');
  if (!host) return;
  const list = lessons();
  const done = list.filter((r) => planFor(r.id)).length;
  const pct = list.length ? Math.round(100 * done / list.length) : 100;
  const day = new Date().toLocaleDateString(LANG === 'sv' ? 'sv-SE' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  host.innerHTML =
    '<div class="tdhead card-elevated">' +
      '<div class="tdsum"><p class="tdkicker">' + esc(day) + '</p>' +
        '<h2>' + esc(list.length ? fillT('tdSummary', { n: done, m: list.length }) : t('tdNone')) + '</h2>' +
        '<div class="tdbar"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="tdactions">' +
        (done < list.length ? '<button class="btn btn-primary" data-tdnext>' + esc(t('tdNext')) + '</button>' : '') +
        '<button class="btn btn-ghost" data-tdadd>' + esc(t('tdAdd')) + '</button></div>' +
    '</div>' +
    (formOpen ? addForm() : '') +
    '<div class="tdlist">' + list.map(lessonCard).join('') + '</div>' +
    '<p class="note">' + esc(t('tdSample')) + '</p>';
}

function saveForm() {
  const v = (id: string) => (maybe$<HTMLInputElement>(id)?.value || '').trim();
  const start = v('td-start'), end = v('td-end');
  const toMin = (s: string) => { const [h = 0, m = 0] = s.split(':').map(Number); return h * 60 + m; };
  const mins = toMin(end) - toMin(start);
  if (!start || !end || mins <= 0) { toast(t('tdBadTime')); return; }
  const subject = v('td-subject'), year = v('td-year');
  const row: Row = {
    id: 'own-' + Date.now().toString(36), start, end, time: start + '–' + end, mins,
    teacher: v('td-teacher'), group: v('td-class'), raw: subject, subject, year,
    room: v('td-room'), cover: v('td-sub') || null, plannable: true,
  };
  ROWS.push(row);
  saveOwn([...loadOwn(), row]);
  formOpen = false;
  renderToday();
}

/** Clicks on the Cover today page. Returns true when it handled one. */
export function todayClick(tg: HTMLElement): boolean {
  if (tg.closest('[data-tdadd]')) { formOpen = !formOpen; renderToday(); if (formOpen) maybe$('td-class')?.focus(); return true; }
  if (tg.closest('[data-tdcancel]')) { formOpen = false; renderToday(); return true; }
  if (tg.closest('[data-tdsave]')) { saveForm(); return true; }
  const rm = tg.closest<HTMLElement>('[data-tdremove]');
  if (rm) {
    const id = rm.getAttribute('data-tdremove')!;
    const i = ROWS.findIndex((r) => r.id === id);
    if (i >= 0) ROWS.splice(i, 1);
    saveOwn(loadOwn().filter((r) => r.id !== id));
    renderToday();
    return true;
  }
  if (tg.closest('[data-tdnext]')) {
    const next = lessons().find((r) => !planFor(r.id));
    if (next) openPlanPanel(next.id);
    return true;
  }
  return false;
}

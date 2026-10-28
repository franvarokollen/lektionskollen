/* ── The department's year planning ──────────────────────
   Every plan this system writes without a topic is a guess from the
   curriculum: a competent lesson that may be three weeks ahead of where the
   class actually is. The people who know where the class is are the heads of
   department, and what they have is a spreadsheet, or a Google Doc, or a wall
   planner someone typed up, or an export from SchoolSoft. There is no finite
   list of formats, so there is no point writing an importer per format.

   Instead: one target shape, week and topic, and a paste box. Anything goes
   in, lk-import reduces it to rows, and - this is the part that matters - a
   person reads the rows and corrects them before anything is saved. Planning
   that imported itself wrong would poison every plan built on it, and nobody
   would be able to tell where the wrongness came from. */
import { CATALOG_SUBJECTS, CATALOG_YEARS, canonSubject, canonYear, subjectLabel, yearLabel } from './lk-catalog';
import { $, LANG, TermCover, TermRow, esc, fillT, maybe$, sb, state, t, toast } from './lk-core';
import { yearNum } from './lk-pool';

function termWhere() {
  return { subject: $<HTMLSelectElement>('tp-subject').value || '', year: $<HTMLSelectElement>('tp-year').value || '' };
}

export async function loadTerm() {
  // The selects are filled from the bank, which is already loaded, plus
  // anything a term plan exists for - a department can plan a subject before
  // anyone has made a single cover lesson in it.
  const cov: TermCover[] = await Promise.resolve(sb.rpc('lk_term_coverage')).then((r) => (r.data || []) as TermCover[]).catch(() => [] as TermCover[]);
  state.termCoverage = cov;
  // Everything a school can teach, plus anything odd already in use.
  const subs = [...new Set([...CATALOG_SUBJECTS,
      ...state.bank.map((b) => canonSubject(b.subject)), ...cov.map((c) => canonSubject(c.subject))])]
    .filter(Boolean).sort((a, b) => subjectLabel(a).localeCompare(subjectLabel(b), LANG));
  const yrs = [...new Set([...CATALOG_YEARS,
      ...state.bank.map((b) => canonYear(b.year_group)), ...cov.map((c) => canonYear(c.year_group))])]
    .filter(Boolean).sort((a, b) => yearNum(a) - yearNum(b));
  const keep = (sel: HTMLSelectElement, list: string[], fmt: (s: string) => string) => {
    const cur = sel.value;
    sel.innerHTML = list.map((x) => '<option value="' + esc(x) + '"' +
      (x === cur ? ' selected' : '') + '>' + esc(fmt(x)) + '</option>').join('');
  };
  keep($<HTMLSelectElement>('tp-subject'), subs, subjectLabel);
  keep($<HTMLSelectElement>('tp-year'), yrs, yearLabel);
  $<HTMLTextAreaElement>('tp-raw').placeholder = t('tpPastePh');
  renderTermCoverage();
  renderTermStored();
}

/** The year planning at a glance, laid out like the bank's Coverage: every
 *  subject down, F to Åk 9 across, each cell the number of weeks planned. The
 *  gaps are the point — a missing year plan means every plan for that class
 *  is a guess from the curriculum. A cell opens that subject and year below. */
const TERM_FULL = 30;   // of about 40 teaching weeks: "the year is planned"
export function renderTermCoverage() {
  const box = maybe$('tp-cov');
  if (!box) return;
  const cov = state.termCoverage;
  const by = new Map(cov.map((c) => [canonSubject(c.subject) + '|' + canonYear(c.year_group), c] as [string, TermCover]));
  const subs = [...new Set([...CATALOG_SUBJECTS, ...cov.map((c) => canonSubject(c.subject))])]
    .filter(Boolean).sort((a, b) => subjectLabel(a).localeCompare(subjectLabel(b), LANG));
  const yrs = [...new Set([...CATALOG_YEARS, ...cov.map((c) => canonYear(c.year_group))])]
    .filter(Boolean).sort((a, b) => yearNum(a) - yearNum(b));
  const { subject: curS, year: curY } = termWhere();
  const planned = cov.length;
  const head = '<tr><th></th>' + yrs.map((y) => '<th>' + esc(y === 'F' ? 'F' : yearLabel(y).replace(/^\D+/, '')) + '</th>').join('') + '</tr>';
  const body = subs.map((s) => '<tr><th>' + esc(subjectLabel(s)) + '</th>' + yrs.map((y) => {
    const c = by.get(s + '|' + y);
    const n = Number(c?.weeks) || 0;
    const on = s === curS && y === curY ? ' sel' : '';
    const tip = n
      ? fillT('tpCellTip', { n, a: c?.first_week ?? '', b: c?.last_week ?? '' }) + ' — ' + subjectLabel(s) + ', ' + yearLabel(y)
      : t('tpCellEmpty') + ' — ' + subjectLabel(s) + ', ' + yearLabel(y);
    return '<td><button class="cv ' + (n >= TERM_FULL ? 'full' : n ? 'some' : 'empty') + on + '" data-tpcell="' + esc(s) + '|' + esc(y) +
      '" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">' + (n || '+') + '</button></td>';
  }).join('') + '</tr>').join('');
  box.innerHTML = '<div class="bcard fx" style="max-width:900px"><h4>' + esc(t('tpCovH')) + '</h4>' +
    '<p class="hint">' + esc(fillT('tpCovNote', { n: planned, full: TERM_FULL })) + '</p>' +
    '<div class="poolcov"><table>' + head + body + '</table></div>' +
    '<p class="cvlegend"><span class="cv full">36</span>' + esc(fillT('tpLegFull', { n: TERM_FULL })) +
    '<span class="cv some">8</span>' + esc(t('tpLegSome')) +
    '<span class="cv empty">+</span>' + esc(t('tpCellEmpty')) + '</p></div>';
}

/** The school year as an editable grid, one row per week, autumn first.
 *  Typing in a cell and saving is the whole manual route: no model, no paste.
 *  Emptying a topic and saving takes that week back out. */
const GRID_WEEKS = (() => {
  const w = [];
  for (let i = 33; i <= 52; i++) w.push(i);
  for (let i = 1; i <= 26; i++) w.push(i);
  return w;
})();

/** The subject and year the week grid on screen belongs to. Saving uses this,
 *  not the selects: a change of select whose rows have not arrived yet must
 *  not send the old subject's rows into the new one. */
let termShown: { subject: string; year: string } | null = null;
let termSeq = 0;
export async function renderTermStored() {
  const { subject, year } = termWhere();
  const box = $('tp-stored');
  const seq = ++termSeq;
  if (!subject || !year) { box.innerHTML = ''; termShown = null; return; }
  const { data, error } = await sb.rpc('lk_term_plan', { p_subject: subject, p_year: year });
  if (seq !== termSeq) return;   // the selects have moved on
  termShown = { subject, year };
  if (error) { box.innerHTML = '<p class="note">' + esc(error.message) + '</p>'; return; }
  const have = new Map<number, TermRow>(((data || []) as TermRow[]).map((r) => [Number(r.week), r] as [number, TermRow]));
  // A week outside the usual run (a summer course, week 53) still shows.
  const weeks = GRID_WEEKS.slice();
  have.forEach((_, w) => { if (!weeks.includes(w)) weeks.push(w); });
  weeks.sort((x, y) => schoolYearPos(x) - schoolYearPos(y));
  const thisWeek = isoWeek(new Date());
  box.innerHTML = '<div class="bcard fx" style="max-width:900px"><h4>' +
    esc(fillT('tpStoredH', { s: subjectLabel(subject), y: yearLabel(year) })) + '</h4>' +
    '<p class="hint">' + esc(fillT('tpStoredN', { n: have.size })) + ' ' + esc(t('tpGridHint')) + '</p>' +
    '<table class="tptable tpgrid"><thead><tr><th>' + esc(t('tpWeek')) + '</th><th>' +
      esc(t('tpTopic')) + '</th><th>' + esc(t('tpNote')) + '</th></tr></thead><tbody>' +
    weeks.map((w) => {
      const r: Partial<TermRow> = have.get(w) || {};
      const topic = r.topic || '', note = r.note || '';
      return '<tr data-gridrow="' + w + '" data-orig="' + esc(topic + '\u0001' + note) + '"' +
        (w === thisWeek ? ' class="now"' : '') + '>' +
        '<td class="wk"><b>' + w + '</b></td>' +
        '<td><input value="' + esc(topic) + '" data-gf="topic"></td>' +
        '<td><input value="' + esc(note) + '" data-gf="note"></td></tr>';
    }).join('') +
    '</tbody></table>' +
    '<div class="strow" style="margin-top:12px"><button class="btn btn-ok btn-sm" id="tp-gridsave">' +
      esc(t('tpGridSave')) + '</button></div></div>';
}

/** ISO week number, the one a Swedish school means by "vecka". */
export function isoWeek(d: Date) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  return Math.ceil(((x.getTime() - Date.UTC(x.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
}

/** Saves only the rows that changed, so a stray save cannot touch weeks
 *  someone else filled in from another screen. */
async function saveGrid() {
  const { subject, year } = termShown || { subject: '', year: '' };
  if (!subject || !year) { toast(t('tpNeedWhere')); return; }
  const rows: TermRow[] = [];
  document.querySelectorAll('[data-gridrow]').forEach((tr) => {
    const topic = tr.querySelector<HTMLInputElement>('[data-gf="topic"]')!.value.trim();
    const note = tr.querySelector<HTMLInputElement>('[data-gf="note"]')!.value.trim();
    if (topic + '\u0001' + note !== tr.getAttribute('data-orig')!) {
      rows.push({ week: tr.getAttribute('data-gridrow')!, topic, note });
    }
  });
  if (!rows.length) { toast(t('tpNoChange')); return; }
  const { data, error } = await sb.rpc('lk_term_plan_save',
    { p_subject: subject, p_year: year, p_rows: rows, p_source: 'grid' });
  if (error || (data && data.ok === false)) {
    toast(t('tpSaveFail') + ' ' + ((error && error.message) || data.error)); return;
  }
  toast(fillT('tpGridSaved', { n: data.saved, c: data.cleared || 0 }));
  loadTerm();
}

/** The rows lk-import read back, editable, with nothing saved yet. */
interface Unclear { text: string; why?: string }
function renderTermPreview(rows: TermRow[] | null | undefined, unclear: Unclear[] | undefined) {
  const box = $('tp-preview');
  if (!rows || !rows.length) {
    box.innerHTML = '<div class="bcard fx" style="max-width:900px;margin-top:14px">' +
      '<p class="note">' + esc(t('tpNothingRead')) + '</p>' +
      unclearBlock(unclear) + '</div>';
    return;
  }
  box.innerHTML = '<div class="bcard fx" style="max-width:900px;margin-top:14px">' +
    '<h4>' + esc(fillT('tpReadH', { n: rows.length })) + '</h4>' +
    '<p class="hint">' + esc(t('tpReadNote')) + '</p>' +
    '<table class="tptable"><thead><tr>' +
      '<th>' + esc(t('tpWeek')) + '</th><th>' + esc(t('tpTopic')) + '</th>' +
      '<th>' + esc(t('tpNote')) + '</th></tr></thead><tbody>' +
    rows.map((r, i) =>
      '<tr data-tprow="' + i + '">' +
        '<td class="wk"><input value="' + esc(r.week) + '" inputmode="numeric" data-tpf="week"></td>' +
        '<td><input value="' + esc(r.topic || '') + '" data-tpf="topic"></td>' +
        '<td><input value="' + esc(r.note || '') + '" data-tpf="note"></td>' +
      '</tr>').join('') +
    '</tbody></table>' +
    unclearBlock(unclear) +
    '<div class="strow" style="margin-top:12px">' +
      '<button class="btn btn-ok btn-sm" id="tp-save">' + esc(t('tpSave')) + '</button>' +
      '<button class="btn btn-ghost btn-sm" id="tp-discard">' + esc(t('tpDiscard')) + '</button>' +
    '</div></div>';
}

/** What the model could not place. Shown, never hidden: a line nobody looks at
 *  is a week the class did something we will never know about. */
function unclearBlock(unclear: Unclear[] | undefined) {
  if (!unclear || !unclear.length) return '';
  return '<div class="tpunclear"><b>' + esc(fillT('tpUnclear', { n: unclear.length })) + '</b>' +
    '<ul>' + unclear.slice(0, 20).map((u) =>
      '<li>' + esc(u.text) + (u.why ? ' — <i>' + esc(u.why) + '</i>' : '') + '</li>').join('') +
    '</ul></div>';
}

/* ── Reading a paste without a model ─────────────────────
   Most year plans pasted from a spreadsheet are already rows: a week, a
   topic, maybe a note, split by tabs. Sending those to a model costs money
   and invents nothing it could not have read itself. So try the plain
   reading first; only text that does not look like rows goes to lk-import.
   Pure function, tested in tools/term-check.mjs. */
const TERM_WEEK = /^(?:vecka|veckor|v\.?|week|wk|w)?\s*(\d{1,2})(?:\s*[-–—]\s*(?:vecka|v\.?|week|wk|w)?\s*(\d{1,2}))?$/i;

export function schoolYearPos(w: number) { return w >= 32 ? w - 32 : w + 21; }

export function parseTermPaste(raw: string) {
  const rows: TermRow[] = [], bad: Unclear[] = [];
  let lines = 0;
  for (const line of String(raw || '').split(/\r?\n/)) {
    const ln = line.trim();
    if (!ln) continue;
    lines++;
    let wkCell: string | undefined, rest: string[];
    if (ln.indexOf('\t') >= 0) {
      const parts = ln.split('\t').map((x) => x.trim());
      wkCell = parts[0];
      rest = parts.slice(1).filter((x, i) => i < 1 || x);
    } else {
      const m = /^([^;,:]{1,22}?)\s*[;,:]\s*(.+)$/.exec(ln) ||
                /^((?:vecka|v\.?|week|wk|w)?\s*\d{1,2}(?:\s*[-–—]\s*\d{1,2})?)\s+[-–—]?\s*(.+)$/i.exec(ln);
      if (!m) { bad.push({ text: ln, why: 'no week' }); continue; }
      wkCell = m[1]!.trim(); rest = [m[2]!.trim()];
    }
    const m = TERM_WEEK.exec(wkCell || '');
    const topic = (rest[0] || '').trim();
    if (!m || !topic) { bad.push({ text: ln, why: m ? 'no topic' : 'no week' }); continue; }
    const a = parseInt(m[1]!, 10), b = m[2] ? parseInt(m[2], 10) : a;
    if (a < 1 || a > 53 || b < 1 || b > 53) { bad.push({ text: ln, why: 'week out of range' }); continue; }
    // A range such as 34-36 runs along the school year, so 50-2 is legal.
    const span = schoolYearPos(b) - schoolYearPos(a);
    if (span < 0 || span > 20) { bad.push({ text: ln, why: 'odd week range' }); continue; }
    const note = rest.slice(1).join(' · ');
    for (let k = 0; k <= span; k++) {
      const w = ((schoolYearPos(a) + k + 32 - 1) % 53) + 1;
      const wk = w > 53 ? w - 53 : w;
      // Week 53 exists in only some years; a range passes over it.
      if (wk === 53 && a !== 53 && b !== 53) continue;
      rows.push({ week: wk, topic, note });
    }
  }
  return { rows, bad, lines };
}

/** Plain reading is trusted only when it explains most of the paste. */
export function termPasteIsRows(r: ReturnType<typeof parseTermPaste>) {
  return r.rows.length > 0 && r.bad.length <= Math.max(1, Math.floor(r.lines * 0.25));
}

async function readTerm() {
  const raw = $<HTMLTextAreaElement>('tp-raw').value.trim();
  if (!raw) { toast(t('tpPasteFirst')); return; }
  const { subject, year } = termWhere();
  const plain = parseTermPaste(raw);
  if (termPasteIsRows(plain)) {
    renderTermPreview(plain.rows, plain.bad.map((b) => ({ text: b.text, why: b.why })));
    return;
  }
  const btn = $<HTMLButtonElement>('tp-read');
  btn.disabled = true; btn.textContent = t('tpReading');
  try {
    const { data, error } = await sb.functions.invoke('lk-import',
      { body: { raw, subject, year_group: year } });
    if (error || !data || data.error) {
      toast(t('tpReadFail') + ' ' + ((data && data.detail) || (error && error.message) || ''));
      return;
    }
    renderTermPreview(data.rows || [], data.unclear || []);
  } finally {
    btn.disabled = false; btn.textContent = t('tpRead');
  }
}

/** Saves what is on screen, not what came back from the model: the edits are
 *  the point of showing the table. */
async function saveTerm() {
  const { subject, year } = termWhere();
  if (!subject || !year) { toast(t('tpNeedWhere')); return; }
  const rows = [...document.querySelectorAll('[data-tprow]')].map((tr) => {
    const f = (k: string) => tr.querySelector<HTMLInputElement>('[data-tpf="' + k + '"]')!.value.trim();
    return { week: f('week'), topic: f('topic'), note: f('note') };
  });
  const { data, error } = await sb.rpc('lk_term_plan_save',
    { p_subject: subject, p_year: year, p_rows: rows, p_source: 'paste' });
  if (error) { toast(t('tpSaveFail') + ' ' + error.message); return; }
  if (data && data.ok === false) { toast(t('tpSaveFail') + ' ' + data.error); return; }
  $('tp-preview').innerHTML = '';
  $<HTMLTextAreaElement>('tp-raw').value = '';
  toast(data.skipped
    ? fillT('tpSavedSome', { n: data.saved, s: data.skipped })
    : fillT('tpSaved', { n: data.saved }));
  loadTerm();
}


/** Listeners this part of the page needs, registered where lk.ts always did. */
export function wireTerm() {
  ['tp-subject', 'tp-year'].forEach((id) =>
    $(id).addEventListener('change', () => { $('tp-preview').innerHTML = ''; renderTermCoverage(); renderTermStored(); }));
  $('tp-reload').addEventListener('click', loadTerm);
  $('tp-read').addEventListener('click', readTerm);
  $('tp-pick').addEventListener('click', () => $('tp-file').click());
  $('tp-file').addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    const f = input.files && input.files[0];
    if (!f) return;
    // Read here rather than uploading: a term plan is a few kilobytes of text,
    // and a file that never leaves the browser needs no storage, no bucket and
    // no retention answer.
    $<HTMLTextAreaElement>('tp-raw').value = await f.text();
    input.value = '';
    readTerm();
  });
  document.addEventListener('click', (e) => {
    const tg = e.target as HTMLElement;
    if (tg.id === 'tp-save') saveTerm();
    if (tg.id === 'tp-gridsave') saveGrid();
    if (tg.id === 'tp-discard') { $('tp-preview').innerHTML = ''; }
  });

}


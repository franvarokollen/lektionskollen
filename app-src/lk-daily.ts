/* ── Daily Cover ─────────────────────────────────────────
   A replica of Frånvarokollen's cover screen, close enough to judge the
   add-on inside it: the coverage donut, the absent-staff chips, and the
   timeline grid with one column per absent teacher and lessons positioned
   by time. The block colours are FVK's own — green covered, amber
   uncovered, red cancelled — and a block carries only what fits at its
   height, as theirs does.

   The add-on adds nothing to this screen. A lesson block is 22-60px tall
   and has no room for a button, so the plan lives one click deep, in the
   popover the coordinator already opens to assign cover. */
import { renderToday } from './lk-today';
import { $, ADDON, CoverPlan, LANG, Row, SHELL, esc, fillT, t } from './lk-core';
import { LOUD, ROWS, planFor, planSettled, renderLoudPicker } from './lk-cover';

const GRID = { gutter: 54, colMin: 150, pxPerHour: 76 };

function hhmmToMins(t: string | undefined) {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Lessons that need a substitute, grouped into a column per absent teacher. */
interface Col { teacher: string; blocks: Row[] }
interface Grid { cols: Col[]; from: number; to: number; span: number; marks: number[] }
function gridModel(): Grid {
  const cols: Col[] = [];
  ROWS.forEach((r) => {
    let c = cols.find((x) => x.teacher === r.teacher);
    if (!c) { c = { teacher: r.teacher, blocks: [] }; cols.push(c); }
    c.blocks.push(r);
  });
  const all = ROWS.map((r) => [hhmmToMins(r.start), hhmmToMins(r.end)] as const);
  const from = Math.floor(Math.min(...all.map((x) => x[0])) / 60) * 60;
  const to = Math.ceil(Math.max(...all.map((x) => x[1])) / 60) * 60;
  const marks: number[] = [];
  for (let m = from; m <= to; m += 60) marks.push(m);
  return { cols, from, to, span: Math.max(1, to - from), marks };
}

function coverageStats() {
  const plannable = ROWS.filter((r) => r.plannable);
  const covered = plannable.filter((r) => r.cover).length;
  const teachers = new Set(ROWS.map((r) => r.teacher)).size;
  return {
    total: plannable.length,
    covered,
    uncovered: plannable.length - covered,
    absent: teachers,
    pct: plannable.length ? Math.round((covered / plannable.length) * 100) : 0,
  };
}

/** FVK's donut: a red ring with the covered share drawn over it in green. */
function donut(pct: number) {
  const size = 72, sw = 7, r = (size - sw) / 2, c = 2 * Math.PI * r;
  return '<circle cx="36" cy="36" r="' + r + '" fill="none" stroke="' + (pct === 0 ? '#e5e7eb' : '#fecaca') + '" stroke-width="' + sw + '"/>' +
    (pct > 0
      ? '<circle cx="36" cy="36" r="' + r + '" fill="none" stroke="#16a34a" stroke-width="' + sw +
        '" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - pct / 100)) +
        '" stroke-linecap="round" transform="rotate(-90 36 36)"/>'
      : '') +
    '<text x="36" y="32" text-anchor="middle" font-size="20" font-weight="700" fill="var(--ink)">' + pct + '%</text>' +
    '<text x="36" y="48" text-anchor="middle" font-size="8" font-weight="600" fill="' +
      (pct >= 100 ? '#16a34a' : 'var(--ink-soft)') + '" letter-spacing="0.5">' +
      esc(t('cvCovered').toUpperCase()) + '</text>';
}

export function renderRows() {
  // On its own, LK lists the day's cover lessons; the grid is FVK's screen.
  if (SHELL === 'lk') return renderToday();
  const st = coverageStats();
  const d = new Date('2026-10-21T12:00:00');
  const loc = LANG === 'sv' ? 'sv-SE' : 'en-GB';
  $('cv-kicker').textContent = t('cvToday') + ' · ' + t('cvWeek') + ' 43';
  $('cv-day').innerHTML = esc(d.toLocaleDateString(loc, { weekday: 'long' })) +
    ' <b>' + d.getDate() + '</b> ' + esc(d.toLocaleDateString(loc, { month: 'long' }));
  $('cv-donut').innerHTML = donut(st.pct);
  $('cv-need').textContent = st.uncovered
    ? st.uncovered + ' ' + t(st.uncovered === 1 ? 'cvLesson' : 'cvLessons') + ' ' + t('cvNeedCover')
    : t('cvAllCovered');
  $('cv-counts').textContent =
    st.absent + ' ' + t('cvAbsent') + ' · ' + st.total + ' ' + t('cvLessons') + ' · ' + st.covered + ' ' + t('cvCovered');

  // Absent staff, one card each, with how far their day is covered.
  const g = gridModel();
  $('cv-chips').innerHTML = g.cols.map((c) => {
    const mine = c.blocks.filter((b) => b.plannable);
    const cov = mine.filter((b) => b.cover).length;
    const all = mine.length > 0 && cov === mine.length;
    return '<div class="schip' + (all ? ' done' : '') + '">' +
      '<span class="sname">' + esc(c.teacher) + '</span>' +
      (mine.length
        ? '<span class="sstat' + (all ? ' ok' : '') + '">' + (all ? '✓ ' + esc(t('cvChipCovered')) : cov + '/' + mine.length + ' ' + esc(t('cvChipCoveredN'))) + '</span>' +
          '<span class="sbar"><i class="' + (all ? 'ok' : '') + '" style="width:' + Math.round(cov / mine.length * 100) + '%"></i></span>'
        : '<span class="sstat">' + esc(t('cvChipAbsent')) + '</span>') +
      (all ? '<span class="stick">✓</span>' : '') + '</div>';
  }).join('');

  // The nudge: covered lessons whose substitute has nothing to teach from.
  // Only slots nobody has decided on. A coordinator who can never clear the
  // list stops reading it.
  const gap = ADDON ? ROWS.filter((r) => r.plannable && r.cover && !planSettled(r.id)).length : 0;
  $('cv-nudge').hidden = !(LOUD === 'nudge' && gap > 0);
  if (LOUD === 'nudge' && gap > 0) {
    $('cv-nudge').innerHTML = '<span>📄</span><div>' +
      esc(fillT('cvGapLine', { n: gap === 1 ? t('cvGap1') : fillT('cvGapN', { n: gap }) })) + '</div>' +
      '<button class="btn btn-soft btn-sm" data-planfirst>' + esc(t('cvGapBtn')) + '</button>';
  }
  renderLoudPicker();

  // The grid itself.
  const h = Math.round(g.span / 60 * GRID.pxPerHour);
  const top = (m: number) => ((m - g.from) / g.span) * 100;
  const lines = g.marks.map((m) => '<div class="hline" style="top:' + top(m) + '%"></div>').join('');

  $('cv-grid').style.minWidth = (GRID.gutter + g.cols.length * GRID.colMin) + 'px';
  $('cv-grid').innerHTML =
    '<div class="gutter" style="width:' + GRID.gutter + 'px">' +
      '<div class="colhead"></div><div class="canvas" style="height:' + h + 'px">' +
      g.marks.map((m) => '<span class="hmark" style="top:calc(' + top(m) + '% - 6px)">' + minsToHHMM(m) + '</span>').join('') +
      '</div></div>' +
    '<div class="cols">' + g.cols.map((c) =>
      '<div class="col" style="min-width:' + GRID.colMin + 'px">' +
        '<div class="colhead"><span>' + esc(c.teacher) + '</span></div>' +
        '<div class="canvas" style="height:' + h + 'px">' + lines +
        c.blocks.map((b) => blockHtml(b, g, h)).join('') +
        '</div></div>').join('') + '</div>';
}

/** What a block calls itself. Break duty and working time have no class or
 *  subject, so they show the timetable's own word for them. */
export function blockTitle(b: Row) {
  const parts = [b.group, b.subject].filter((x) => x && x !== '—');
  return parts.length ? parts.join(' ') : b.raw;
}

/** The one glyph a block can spare. Nothing for a slot nobody has decided on,
 *  and nothing for one deliberately marked as needing no plan: a grid that
 *  marks everything marks nothing. */
function planMark(p: CoverPlan) {
  const marks: Record<string, string[] | null> = { generated: p.approved ? ['✓', 'ok', 'cvHasPlan'] : ['○', '', 'cvPlanDraft'],
              linked: ['🔗', 'ok', 'cvHasLinked'],
              note: ['🔗', 'ok', 'cvHasNote'],
              authored: ['✓', 'ok', 'cvHasLinked'],
              not_needed: null };
  const m = marks[p.kind];
  if (!m) return '';
  return '<span class="bplan ' + m[1] + '" title="' + esc(t(m[2]!)) + '">' + m[0] + '</span>';
}

function minsToHHMM(m: number) {
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

/** One lesson. Status decides the colour; height decides how much it can say. */
function blockHtml(b: Row, g: Grid, gridH: number) {
  const s = hhmmToMins(b.start), e = hhmmToMins(b.end);
  const topPct = ((s - g.from) / g.span) * 100;
  const hPct = ((e - s) / g.span) * 100;
  const px = hPct / 100 * gridH;
  const status = !b.plannable ? 'nonteach' : b.cover ? 'covered' : 'uncovered';
  const plan = planFor(b.id);
  return '<div class="blk ' + status + '" role="button" tabindex="0" data-blk="' + esc(b.id) + '"' +
    ' style="top:calc(' + topPct + '% + 1px);height:calc(' + hPct + '% - 3px);min-height:22px"' +
    ' title="' + esc([b.group, b.subject].filter(Boolean).join(' ') + ' · ' + b.time + (b.cover ? ' · ✓ ' + b.cover : '')) + '">' +
    '<p class="bt">' + esc(blockTitle(b)) + '</p>' +
    (px >= 34 ? '<p class="bm">' + esc(b.time) + '</p>' : '') +
    (px >= 48 && b.cover ? '<p class="bc">✓ ' + esc(b.cover) + '</p>' : '') +
    (ADDON && plan && LOUD !== 'quiet' && px >= 30 ? planMark(plan) : '') +
    '</div>';
}

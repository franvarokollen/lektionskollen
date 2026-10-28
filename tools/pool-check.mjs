// Does the pool keep every plan, in rank, on the right shelf?
//
// The pool shows one shelf at a time: a rail of subjects, year-group chips,
// and that shelf's cards. A second view, Coverage, counts plans per subject
// and year group. Things that can go wrong and are not visible at a glance:
//
//   a plan disappears, or renders twice, because grouping dropped a bucket;
//   "Åk 10" sorts next to "Åk 1", because year groups are text;
//   the ranking is lost, so the first card in a row is not the best plan;
//   a coverage cell counts a different number of plans than its shelf shows.
//
// renderBank is lifted out of app/lk.js rather than copied, so this cannot
// pass against a stale duplicate. Everything it touches that is not the
// pool itself is stubbed.
//
//   node tools/pool-check.mjs                  the built-in fixture
//   node tools/pool-check.mjs pool.json        rows from lk_pool

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const src = readFileSync(new URL('../app/lk.js', import.meta.url), 'utf8');
const from = src.indexOf('function yearNum(');
const to = src.indexOf('function fillT(');
if (from === -1 || to === -1 || to < from) {
  console.error('pool-check: could not find renderBank in app/lk.js');
  process.exit(2);
}

const STUB = `
let LANG = 'sv';
export function setLang(l) { LANG = l; }
const SUBJECTS_EN = { Matematik:'Maths', Svenska:'Swedish', Engelska:'English',
  Biologi:'Biology', Fysik:'Physics', Kemi:'Chemistry', Historia:'History',
  Geografi:'Geography', Musik:'Music', Idrott:'PE', Bild:'Art',
  'Samhällskunskap':'Civics' };
function subjectLabel(s){ if (LANG!=='en'||!s) return s||''; return SUBJECTS_EN[s]||s; }
function yearLabel(y){ if (y==='F') return LANG==='en'?'Preschool class':'Förskoleklass';
  if (LANG!=='en'||!y) return y||'';
  const m=/^\\s*Åk\\s*(\\d+)/.exec(y); return m?'Year '+m[1]:y; }
const esc = (x)=>String(x==null?'':x);
const t = (k)=>k;
const fillT = (k,o)=>k+JSON.stringify(o);
const CHK = '';
const CATALOG_YEARS = ['F','Åk 1','Åk 2','Åk 3','Åk 4','Åk 5','Åk 6','Åk 7','Åk 8','Åk 9'];
const CATALOG_SUBJECTS = ['Matematik','Svenska','Engelska','Biologi','Musik','Bild','Samhällskunskap'];
const usedLine = ()=>'';
const rowTitle = (b)=>b.title;
export const state = { bank: [], pool: { view: 'shelf', sub: '', yr: '' } };
const EL = { innerHTML: '' };
const $ = () => EL;
const maybe$ = () => null;
const localStorage = { getItem: () => null, setItem: () => {} };
export const out = () => EL.innerHTML;
export { renderBank, yearNum };
`;

const dir = mkdtempSync(join(tmpdir(), 'lk-pool-'));
const mod = join(dir, 'pool.mjs');
writeFileSync(mod, STUB + '\n' + src.slice(from, to));
const { renderBank, yearNum, state, out, setLang } = await import(`file://${mod}`);

// Deliberately awkward: a two-digit year, a non-numeric year, one subject
// spanning several years, two plans sharing a title, and subjects whose
// Swedish and English names sort differently.
const FIXTURE = [
  { id: 'a', title: 'Pythagoras', subject: 'Matematik', year_group: 'Åk 9', minutes: 60, approved: true, approval_rank: 3, approved_name: 'Quinn Q', approved_subject: 'Matematik' },
  { id: 'b', title: 'Bråk', subject: 'Matematik', year_group: 'Åk 10', minutes: 60, approved: true, approval_rank: 2, approved_name: 'Tom T' },
  { id: 'c', title: 'Tallinjen', subject: 'Matematik', year_group: 'Åk 1', minutes: 60, approved: true, approval_rank: 1 },
  { id: 'd', title: 'Procent', subject: 'Matematik', year_group: 'Åk 9', minutes: 60, approved: true, approval_rank: 0, approval_stale: true },
  { id: 'e', title: 'Gymkurs', subject: 'Matematik', year_group: 'Gy1', minutes: 60, approved: false, approval_rank: 0 },
  { id: 'f', title: 'Past perfect', subject: 'Engelska', year_group: 'Åk 9', minutes: 60, approved: true },
  { id: 'g', title: 'Past perfect', subject: 'Engelska', year_group: 'Åk 9', minutes: 60, approved: true },
  { id: 'h', title: 'Notvärden', subject: 'Musik', year_group: 'Åk 6', minutes: 60, approved: true },
  { id: 'i', title: 'Val', subject: 'Samhällskunskap', year_group: 'Åk 8', minutes: 60, approved: true },
  { id: 'j', title: 'Akvarell', subject: 'Bild', year_group: 'Åk 7', minutes: 60, approved: true },
  { id: 'k', title: 'Räkna till tio', subject: 'Matematik', year_group: 'F', minutes: 40, approved: false, approval_rank: 0 },
  { id: 'l', title: 'Bokstäverna', subject: 'Svenska', year_group: 'Åk 1', minutes: 40, approved: false },
];

function check(name, rows) {
  const ranked = rows.map((r) => r.id);
  const want = new Map(rows.map((r) => [r.id, r.approved ? (Number(r.approval_rank) || 0) : 0]));
  let bad = 0;

  for (const lang of ['sv', 'en']) {
    setLang(lang);
    state.bank = rows;
    const fails = [];

    // Shelf view, all years: walk every subject in the rail.
    state.pool = { view: 'shelf', sub: '', yr: '' };
    renderBank();
    const rail = [...out().matchAll(/data-poolsub="([^"]*)"><span class="dot"><\/span><span class="l">([^<]*)<\/span><span class="n">(\d+)</g)]
      .map((m) => ({ key: m[1], label: m[2], n: +m[3] }));
    const labels = rail.map((r) => r.label);
    const inOrder = labels.slice().sort((a, b) => a.localeCompare(b, lang));
    if (labels.join('|') !== inOrder.join('|')) fails.push(`rail out of label order: ${labels.join(', ')}`);
    if (rail.reduce((a, r) => a + r.n, 0) !== rows.length) fails.push('rail counts do not add up to the pool');

    const seen = [];
    for (const r of rail) {
      state.pool = { view: 'shelf', sub: r.key, yr: '' };
      renderBank();
      const html = out();
      const cards = [...html.matchAll(/data-viewplan="([^"]+)"/g)].map((m) => m[1]);
      if (cards.length !== r.n) fails.push(`${r.label}: rail says ${r.n}, shelf shows ${cards.length}`);
      seen.push(...cards);

      // Each grid is one year group: its cards must keep lk_pool's relative order.
      for (const m of html.matchAll(/<div class="grid">(.*?)<\/div><\/div>/gs)) {
        const ids = [...m[1].matchAll(/data-viewplan="([^"]+)"/g)].map((x) => x[1]);
        const at = ids.map((id) => ranked.indexOf(id));
        if (at.some((v, k) => k && v < at[k - 1])) fails.push(`${r.label}: rank order broken inside a year group`);
      }
      // Years ascending, numerically — headers and chips alike.
      const ys = [...html.matchAll(/class="poolyear"><h4>([^<]*)<\/h4>/g)].map((m) => m[1]);
      const chips = [...html.matchAll(/data-poolyr="([^"]+)"/g)].map((m) => m[1]);
      // Sorted on the stored value (F, Åk 1 …), not the label the reader sees.
      const nums = chips.map(yearNum);
      if (nums.some((v, k) => k && v < nums[k - 1])) fails.push(`${r.label}: year chips out of order: ${chips.join(', ')}`);
      if (ys.length !== chips.length) fails.push(`${r.label}: ${ys.length} year sections for ${chips.length} chips`);
      // One chip opens exactly that year's plans.
      for (const y of chips) {
        state.pool = { view: 'shelf', sub: r.key, yr: y };
        renderBank();
        const ids = [...out().matchAll(/data-viewplan="([^"]+)"/g)].map((m) => m[1]);
        const exp = rows.filter((x) => (x.subject || '') === r.key && (x.year_group || '') === y).map((x) => x.id);
        if (ids.join() !== exp.join()) fails.push(`${r.label} ${y}: chip shows ${ids.join()} not ${exp.join()}`);
      }

      // Every card carries its rung.
      for (const part of html.split('data-viewplan="').slice(1)) {
        const id = part.slice(0, part.indexOf('"'));
        const m = /apLevel\{"n":(\d)/.exec(part);
        if (!m) fails.push(`card ${id} shows no approval level`);
        else if (Number(m[1]) !== want.get(id)) fails.push(`card ${id} shows level ${m[1]}, plan is ${want.get(id)}`);
      }
    }
    if (seen.length !== rows.length) fails.push(`${seen.length} cards for ${rows.length} plans`);
    if (new Set(seen).size !== seen.length) fails.push('a plan rendered twice');
    if (new Set(seen).size !== new Set(ranked).size) fails.push('a plan went missing');

    // A remembered shelf the filter no longer has falls back, not blank.
    state.pool = { view: 'shelf', sub: 'Nothing', yr: 'Åk 99' };
    renderBank();
    if (!/data-viewplan=/.test(out())) fails.push('a stale pick renders an empty shelf');

    // Coverage: every plan counted once, in the right cell.
    state.pool = { view: 'cover', sub: '', yr: '' };
    renderBank();
    const cells = [...out().matchAll(/data-poolcell="([^"|]*)\|([^"]*)"[^>]*>(\d+)</g)];
    const counted = cells.reduce((a, m) => a + +m[3], 0);
    if (counted !== rows.length) fails.push(`coverage counts ${counted}, pool has ${rows.length}`);
    for (const m of cells) {
      const n = rows.filter((x) => (x.subject || '') === m[1] && (x.year_group || '') === m[2]).length;
      if (n !== +m[3]) fails.push(`coverage ${m[1]} ${m[2]} says ${m[3]}, has ${n}`);
    }

    console.log(`${fails.length ? '✕' : '✓'} ${name} [${lang}] — ${rail.length} subjects, ${seen.length} plans, ${cells.length} coverage cells`);
    for (const f of fails) console.log('    ' + f);
    bad += fails.length;
  }
  return bad;
}

let bad = check('fixture', FIXTURE);
for (const f of process.argv.slice(2)) {
  const raw = JSON.parse(readFileSync(f, 'utf8'));
  bad += check(f, Array.isArray(raw) ? raw : raw.rows ?? []);
}
console.log(bad
  ? '\nThe pool loses, misplaces or reorders plans. Fix it.'
  : '\nEvery plan on its shelf, in rank, years ascending, coverage adds up.');
process.exit(bad ? 1 : 0);

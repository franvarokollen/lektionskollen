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
// renderBank is the real module (app-src/lk-pool.ts, with the real subject
// and year catalogue), bundled here so this cannot pass against a stale
// duplicate. Only lk-core — the database client, the page, the strings — is
// stubbed.
//
//   node tools/pool-check.mjs                  the built-in fixture
//   node tools/pool-check.mjs pool.json        rows from lk_pool

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

const CORE = `
export let LANG = 'sv';
export function setLang(l) { LANG = l; }
export const esc = (x) => String(x == null ? '' : x);
export const t = (k) => k;
export const fillT = (k, o) => k + JSON.stringify(o);
export const CHK = '';
export const state = { bank: [], pool: { view: 'shelf', sub: '', yr: '' } };
const EL = { innerHTML: '' };
export const $ = () => EL;
export const maybe$ = () => null;
export const sb = {};
export const out = () => EL.innerHTML;
`;

const r = await build({
  stdin: { contents: "export { renderBank, yearNum } from './app-src/lk-pool.ts'; export { state, out, setLang } from 'lk-core-stub';",
           resolveDir: new URL('..', import.meta.url).pathname, loader: 'ts' },
  bundle: true, format: 'esm', write: false, logLevel: 'warning',
  plugins: [{ name: 'stub-core', setup(b) {
    b.onResolve({ filter: /(^|\/)lk-core(-stub)?$/ }, () => ({ path: 'lk-core', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: CORE, loader: 'js' }));
  } }],
});
const dir = mkdtempSync(join(tmpdir(), 'lk-pool-'));
const mod = join(dir, 'pool.mjs');
// localStorage is only touched to remember the pick; node has none.
writeFileSync(mod, 'const localStorage = { getItem: () => null, setItem: () => {} };\n' + r.outputFiles[0].text);
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

      // All years is one grid: years ascending, lk_pool's order kept inside each.
      const ids = [...html.matchAll(/data-viewplan="([^"]+)"/g)].map((m) => m[1]);
      const yrOf = (id) => rows.find((x) => x.id === id).year_group || '';
      const yn = ids.map((id) => yearNum(yrOf(id)));
      if (yn.some((v, k) => k && v < yn[k - 1])) fails.push(`${r.label}: cards not in year order`);
      for (const y of new Set(ids.map(yrOf))) {
        const at = ids.filter((id) => yrOf(id) === y).map((id) => ranked.indexOf(id));
        if (at.some((v, k) => k && v < at[k - 1])) fails.push(`${r.label} ${y}: rank order broken`);
      }
      if ((html.match(/class="pc-yr"/g) || []).length !== ids.length) fails.push(`${r.label}: a card in All years does not name its year`);
      // Chips sorted on the stored value (F, Åk 1 …), not the label the reader sees.
      const chips = [...html.matchAll(/data-poolyr="([^"]+)"/g)].map((m) => m[1]);
      const nums = chips.map(yearNum);
      if (nums.some((v, k) => k && v < nums[k - 1])) fails.push(`${r.label}: year chips out of order: ${chips.join(', ')}`);

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

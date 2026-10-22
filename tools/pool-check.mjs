// Does the pool group correctly, and does grouping lose anything?
//
// The pool used to be one flat grid in rank order. It is now grouped by
// subject and, inside that, by year group. Three things can go wrong and none
// of them are visible at a glance on a page of thirty cards:
//
//   a plan disappears, or renders twice, because grouping dropped a bucket;
//   "Ak 10" sorts next to "Ak 1", because year groups are text;
//   the ranking is lost, so the first card in a row is not the best plan.
//
// renderBank is lifted out of app/lk.js rather than copied, so this cannot
// pass against a stale duplicate. Everything it touches that is not the
// grouping itself is stubbed.
//
//   node tools/pool-check.mjs                  the built-in fixture
//   node tools/pool-check.mjs pool.json        rows from lk_pool

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const src = readFileSync(new URL('../app/lk.js', import.meta.url), 'utf8');
const from = src.indexOf('/** The year group as a number');
const to = src.indexOf('/* ── When a plan reaches the shared pool');
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
function yearLabel(y){ if (LANG!=='en'||!y) return y||'';
  const m=/^\\s*Åk\\s*(\\d+)/.exec(y); return m?'Year '+m[1]:y; }
const esc = (x)=>String(x==null?'':x);
const t = (k)=>k;
const fillT = (k,o)=>k+JSON.stringify(o);
const CHK = '';
const usedLine = ()=>'';
const rowTitle = (b)=>b.title;
export const state = { bank: [] };
const EL = { innerHTML: '' };
const $ = () => EL;
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
];

function check(name, rows) {
  const ranked = rows.map((r) => r.id);
  let bad = 0;

  for (const lang of ['sv', 'en']) {
    setLang(lang);
    state.bank = rows;
    renderBank();
    const html = out();
    const fails = [];

    // The subject label follows an accent dot (<span class="dot"></span>), not <h3> directly.
    const heads = [...html.matchAll(/<h3><span class="dot"><\/span>([^<]*)<span class="n">(\d+)</g)].map((m) => [m[1], +m[2]]);
    const cards = [...html.matchAll(/data-viewplan="([^"]+)"/g)].map((m) => m[1]);

    if (cards.length !== rows.length) fails.push(`${cards.length} cards for ${rows.length} plans`);
    if (new Set(cards).size !== cards.length) fails.push('a plan rendered twice');
    if (new Set(cards).size !== new Set(ranked).size) fails.push('a plan went missing');
    const summed = heads.reduce((a, [, n]) => a + n, 0);
    if (summed !== rows.length) fails.push(`header counts sum to ${summed}, not ${rows.length}`);

    // Every card carries its rung: stars and a number that match approval_rank
    // (0 for a plan that is unapproved, whatever else the row claims).
    const want = new Map(rows.map((r) => [r.id, r.approved ? (Number(r.approval_rank) || 0) : 0]));
    for (const part of html.split('data-viewplan="').slice(1)) {
      const id = part.slice(0, part.indexOf('"'));
      const m = /apLevel\{"n":(\d)/.exec(part);
      if (!m) fails.push(`card ${id} shows no approval level`);
      else if (Number(m[1]) !== want.get(id)) fails.push(`card ${id} shows level ${m[1]}, plan is ${want.get(id)}`);
      const lit = (part.match(/<i class="on">/g) || []).length;
      if (m && lit !== want.get(id)) fails.push(`card ${id} lights ${lit} stars for level ${want.get(id)}`);
    }

    const labels = heads.map(([s]) => s);
    const inOrder = labels.slice().sort((a, b) => a.localeCompare(b, lang));
    if (labels.join('|') !== inOrder.join('|')) {
      fails.push(`subject headers out of label order: ${labels.join(', ')}`);
    }

    // Each grid is one year group: its cards must keep lk_pool's relative order.
    for (const m of html.matchAll(/<div class="grid">(.*?)<\/div><\/div>/gs)) {
      const ids = [...m[1].matchAll(/data-viewplan="([^"]+)"/g)].map((x) => x[1]);
      const at = ids.map((id) => ranked.indexOf(id));
      if (at.some((v, k) => k && v < at[k - 1])) fails.push('rank order broken inside a group');
    }

    // Years ascending within each subject, numerically.
    for (const sec of html.split('<section class="poolsub">').slice(1)) {
      const ys = [...sec.matchAll(/class="poolyear"><h4>([^<]*)<\/h4>/g)].map((m) => m[1]);
      const nums = ys.map(yearNum);
      if (nums.some((v, k) => k && v < nums[k - 1])) {
        fails.push(`year groups out of order: ${ys.join(', ')}`);
      }
    }

    console.log(`${fails.length ? '✕' : '✓'} ${name} [${lang}] — ` +
                `${heads.length} subjects, ${cards.length} plans`);
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
  ? '\nThe pool loses or reorders plans. Fix it.'
  : '\nGrouping keeps every plan, in rank, with years ascending.');
process.exit(bad ? 1 : 0);

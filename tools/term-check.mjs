// Does a pasted year plan become the right weeks, without a model?
// Lifted from app/lk.js so it cannot pass against a stale copy.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const src = readFileSync(new URL('../app/lk.js', import.meta.url), 'utf8');
const from = src.indexOf('const TERM_WEEK =');
const to = src.indexOf('async function readTerm()');
if (from < 0 || to < from) { console.error('term-check: parser not found'); process.exit(2); }
const dir = mkdtempSync(join(tmpdir(), 'lk-term-'));
const mod = join(dir, 't.mjs');
writeFileSync(mod, src.slice(from, to) + '\nexport { parseTermPaste, termPasteIsRows, schoolYearPos };');
const { parseTermPaste, termPasteIsRows, schoolYearPos } = await import('file://' + mod);

let bad = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { bad++; console.log('✕ ' + name + '\n   got  ' + JSON.stringify(got) + '\n   want ' + JSON.stringify(want)); }
  else console.log('✓ ' + name);
};
const weeks = (raw) => parseTermPaste(raw).rows.map((r) => r.week);

eq('tab rows with note', parseTermPaste('34\tBråk\tTest v36').rows,
   [{ week: 34, topic: 'Bråk', note: 'Test v36' }]);
eq('v-prefix and Swedish word', weeks('v35\tProcent\nvecka 36\tGeometri'), [35, 36]);
eq('range expands', weeks('34-36\tBråk'), [34, 35, 36]);
eq('range across new year', weeks('51-2\tJul'), [51, 52, 1, 2]);
eq('range passes over week 53', weeks('52-1\tLov'), [52, 1]);
eq('week 53 can be named', weeks('53\tLov'), [53]);
eq('comma and colon', weeks('34, Bråk\n35: Procent'), [34, 35]);
eq('topic keeps its commas', parseTermPaste('34, Bråk, decimaler och procent').rows[0].topic,
   'Bråk, decimaler och procent');
eq('space separated', weeks('34 Bråk\nv35 - Procent'), [34, 35]);
eq('header line is reported, not guessed', parseTermPaste('Vecka\tMoment\n34\tBråk').bad.length, 1);
eq('week out of range is reported', parseTermPaste('0\tX\n60\tY').rows.length, 0);
eq('backwards range is reported', parseTermPaste('36-34\tBråk').rows.length, 0);
eq('prose goes to the model', termPasteIsRows(parseTermPaste(
   'Under hösten arbetar vi med bråk och sedan procent.\nEfter jul börjar vi med geometri.')), false);
eq('clean paste is trusted', termPasteIsRows(parseTermPaste(
   '34\tA\n35\tB\n36\tC\n37\tD\n38\tHeader?')), true);
eq('school-year order', [40, 52, 53, 1, 26].map(schoolYearPos), [8, 20, 21, 22, 47]);

console.log(bad ? '\nThe plain reading is wrong. Fix it.' : '\nA pasted year plan is read correctly.');
process.exit(bad ? 1 : 0);

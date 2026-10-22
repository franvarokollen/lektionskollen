// Does the generator ask for the right plan for the pupils and the subject?
// Pure prompt checks: free, no model call. Transpiles the real prompt.ts.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'lk-prompt-'));
const js = execFileSync('npx', ['-y', 'esbuild', '--format=esm',
  new URL('../supabase/functions/lk-generate/prompt.ts', import.meta.url).pathname],
  { encoding: 'utf8' });
writeFileSync(join(dir, 'p.mjs'), js);
const { buildMessages, yearNumber, needsSafety } = await import('file://' + join(dir, 'p.mjs'));

const sys = (subject, year_group) =>
  buildMessages({ subject, year_group, minutes: 40, language: 'sv' })[0].content;
let bad = 0;
const ok = (name, cond) => { if (!cond) bad++; console.log((cond ? '✓ ' : '✕ ') + name); };

for (const [y, n] of [['F', 0], ['Fsk', 0], ['Förskoleklass', 0], ['Åk 1', 1], ['Åk 9', 9], ['ak 4', 4]])
  ok(`year ${y} reads as ${n}`, yearNumber(y) === n);
for (const y of ['Gy1', '', 'Åk 10', 'Åk 0', null]) ok(`year ${JSON.stringify(y)} is not a grundskola year`, yearNumber(y) === null);

ok('förskoleklass: read aloud, no reading', /cannot read yet/.test(sys('Matematik', 'F')));
ok('Åk 1: read aloud', /cannot read yet/.test(sys('Svenska', 'Åk 1')));
ok('Åk 3: reading still new', /Reading is still new/.test(sys('Svenska', 'Åk 3')) && !/cannot read yet/.test(sys('Svenska', 'Åk 3')));
ok('Åk 3: movement break', /movement/.test(sys('Matematik', 'Åk 3')));
ok('Åk 5: 80 words', /80 words/.test(sys('Matematik', 'Åk 5')));
ok('Åk 8: defines subject words', /define every subject word/.test(sys('Matematik', 'Åk 8')));
ok('Åk 8 gets no early-years rules', !/read aloud/.test(sys('Matematik', 'Åk 8')));
ok('gymnasiet gets no age rules', !/YEAR-GROUP FIT/.test(sys('Matematik', 'Gy1')));

for (const s of ['Idrott', 'Idrott och hälsa', 'Slöjd', 'Hem- och konsumentkunskap', 'Kemi', 'Fysik', 'Teknik', 'Bild', 'NO'])
  ok(`${s} carries the safety rules`, needsSafety(s) && /SAFETY/.test(sys(s, 'Åk 7')));
for (const s of ['Matematik', 'Svenska', 'Historia', 'Engelska', 'Musik', 'Religionskunskap', 'Samhällskunskap', 'Geografi'])
  ok(`${s} has none`, !needsSafety(s) && !/SAFETY\./.test(sys(s, 'Åk 7')));

ok('hard rules survive', /No phantom references/.test(sys('Matematik', 'F')) && /Respond with ONE JSON/.test(sys('Slöjd', 'Åk 2')));

console.log(bad ? '\nThe prompt asks for the wrong plan. Fix it.' : '\nThe prompt fits the year and the subject.');
process.exit(bad ? 1 : 0);

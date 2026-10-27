// Both languages, every time.
//
// Swedish and English are not a nice-to-have here: a coordinator may run the
// app in either, and a substitute opens the plan link in whichever they read.
// Three separate bugs got through because a key was added to one side only, or
// pasted into the wrong block where a duplicate silently overwrote it. This
// check is cheap and catches all three shapes:
//
//   1. a key present in one language and not the other
//   2. a duplicate key inside one block (JavaScript keeps the last and says
//      nothing, which is how four English strings ended up hidden inside the
//      Swedish block)
//   3. a value that is identical in both, which is usually a forgotten
//      translation rather than a word that happens to be the same
//
// Run: node tools/i18n-check.mjs

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const root = new URL('../app/', import.meta.url);
const read = (f) => readFileSync(new URL(f, root), 'utf8');

let failures = 0;
const fail = (msg) => { failures++; console.error('  ✗ ' + msg); };
const ok = (msg) => console.log('  ✓ ' + msg);

/** Words that really are spelled the same in both languages. */
const SAME_BY_DESIGN = new Set([
  'resWhiteboard', 'exitTicket', 'showInSv', 'showInEn', 'min', 'ok',
  'exit',          // "Exit ticket" is used as-is in Swedish schools
  'tierStandard',  // "Standard" is the Swedish word too
]);

/** Keys declared more than once in one object literal — the silent overwrite. */
function duplicateKeys(block, label) {
  const seen = new Map();
  for (const m of block.matchAll(/(?:^|[{,]\s*)\n?\s*([a-zA-Z_][\w]*)\s*:/g)) {
    seen.set(m[1], (seen.get(m[1]) || 0) + 1);
  }
  const dupes = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
  if (dupes.length) fail(`${label}: declared twice — ${dupes.join(', ')}`);
  else ok(`${label}: no duplicate keys`);
}

function compare(a, b, labelA, labelB, where) {
  const missB = Object.keys(a).filter((k) => !(k in b));
  const missA = Object.keys(b).filter((k) => !(k in a));
  if (missB.length) fail(`${where}: missing from ${labelB} — ${missB.join(', ')}`);
  if (missA.length) fail(`${where}: missing from ${labelA} — ${missA.join(', ')}`);
  if (!missA.length && !missB.length) ok(`${where}: ${Object.keys(a).length} keys in both`);

  const same = Object.keys(a).filter((k) =>
    k in b && !SAME_BY_DESIGN.has(k) &&
    typeof a[k] === 'string' && a[k] === b[k] &&
    a[k].length > 3 && /[a-zA-Z]/.test(a[k]));
  if (same.length) fail(`${where}: identical in both, so probably untranslated — ${same.join(', ')}`);
  else ok(`${where}: nothing left untranslated`);
}

console.log('i18n.ts');
// Duplicate keys are checked in the TypeScript (the compiler rejects them too, but
// this names the block); the values are compared from the built file the page loads.
const srcOf = (f) => readFileSync(new URL('../app-src/' + f, import.meta.url), 'utf8');
const i18nSrc = srcOf('i18n.ts');
const sandbox = { window: {} };
createContext(sandbox);
runInContext(read('i18n.js'), sandbox);
const T = sandbox.window.LK_T;
if (!T || !T.sv || !T.en) { fail('i18n.js did not define window.LK_T.sv and .en'); }
else {
  const svBlock = i18nSrc.slice(i18nSrc.indexOf('const sv = {'), i18nSrc.indexOf('const en: Strings = {'));
  const enBlock = i18nSrc.slice(i18nSrc.indexOf('const en: Strings = {'));
  duplicateKeys(svBlock, 'sv');
  duplicateKeys(enBlock, 'en');
  compare(T.sv, T.en, 'sv', 'en', 'app strings');
}

console.log('plan-labels.ts');
const labelsSrc = srcOf('plan-labels.ts');
const literal = (name) => {
  const i = labelsSrc.indexOf(`const ${name}`);
  if (i < 0) return null;
  const open = labelsSrc.indexOf('= {', i) + 2;
  const close = labelsSrc.indexOf('\n}', open) + 2;
  return labelsSrc.slice(open, close);
};
const SV = literal('SV_LABELS'), EN = literal('EN_LABELS');
if (!SV || !EN) fail('plan-labels.ts: could not find SV_LABELS / EN_LABELS');
else {
  duplicateKeys(SV, 'SV_LABELS');
  duplicateKeys(EN, 'EN_LABELS');
  const box = {};
  createContext(box);
  compare(runInContext('(' + SV + ')', box), runInContext('(' + EN + ')', box),
          'SV_LABELS', 'EN_LABELS', 'substitute page');
}

console.log(failures ? `\n${failures} problem(s).` : '\nBoth languages complete.');
process.exit(failures ? 1 : 0);

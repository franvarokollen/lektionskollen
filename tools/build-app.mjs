#!/usr/bin/env node
// Build the app's scripts from app-src/ (TypeScript) into app/ (what GitHub Pages serves).
//
//   node tools/build-app.mjs           write app/*.js
//   node tools/build-app.mjs --check   fail if a committed app/*.js is not what the source builds
//
// The outputs are committed, because Pages serves the branch as it is and has no
// build step. They are generated: edit app-src/, never app/*.js. --check is how
// that stays true, and it is cheap enough to run on every commit.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ENTRIES = {
  'app/i18n.js': 'app-src/i18n.entry.ts',
  'app/plan-view.js': 'app-src/plan-view.entry.ts',
};
const only = process.argv.includes('--check');
let stale = 0;

for (const [outfile, entry] of Object.entries(ENTRIES)) {
  if (!existsSync(entry)) continue;
  const r = await build({
    entryPoints: [entry], bundle: true, format: 'iife', target: 'es2020',
    legalComments: 'none', write: false, outfile, logLevel: 'warning',
    banner: { js: `/* GENERATED from ${entry} by tools/build-app.mjs. Edit the TypeScript, not this file. */` },
  });
  const text = r.outputFiles[0].text;
  if (only) {
    const now = existsSync(outfile) ? readFileSync(outfile, 'utf8') : '';
    if (now !== text) { console.error(`${outfile}: out of date with ${entry}. Run: node tools/build-app.mjs`); stale++; }
  } else {
    writeFileSync(outfile, text);
    console.log(`${outfile}  ←  ${entry}  (${text.length} bytes)`);
  }
}
process.exit(stale ? 1 : 0);

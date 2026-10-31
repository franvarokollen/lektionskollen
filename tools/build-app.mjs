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
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

const ENTRIES = {
  'app/i18n.js': 'app-src/i18n.entry.ts',
  'app/plan-view.js': 'app-src/plan-view.entry.ts',
  'app/lk.js': 'app-src/lk.ts',
  'app/plan.js': 'app-src/plan.ts',
};
const only = process.argv.includes('--check');
const NOTICE = '© 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential; copying, scraping or reverse engineering is prohibited.';
let stale = 0;

for (const [outfile, entry] of Object.entries(ENTRIES)) {
  if (!existsSync(entry)) continue;
  const r = await build({
    entryPoints: [entry], bundle: true, format: 'iife', target: 'es2020',
    // Minified: what ships to a browser can always be read, but it should not
    // be a readable copy of the source. Error reports carry line and column;
    // rebuild the same commit with --sourcemap to map them back.
    minify: true, sourcemap: process.argv.includes('--sourcemap') ? 'external' : false,
    legalComments: 'none', write: false, outfile, logLevel: 'warning',
    banner: { js: `/*! ${NOTICE} Generated from ${entry}. */` },
  });
  const out = r.outputFiles.find((f) => f.path.endsWith('.js'));
  const text = out.text;
  // Source maps are for debugging an error report locally, never committed.
  for (const f of r.outputFiles) if (f.path.endsWith('.map') && !only) writeFileSync(f.path, f.text);
  if (only) {
    const now = existsSync(outfile) ? readFileSync(outfile, 'utf8') : '';
    if (now !== text) { console.error(`${outfile}: out of date with ${entry}. Run: node tools/build-app.mjs`); stale++; }
  } else {
    writeFileSync(outfile, text);
    console.log(`${outfile}  ←  ${entry}  (${text.length} bytes)`);
  }
}
// One stylesheet for both pages, from one file per screen in app-src/css/.
// The number in each name is its place in the cascade: later rules win ties,
// so the order is part of the design, not an accident of the file listing.
{
  const dir = 'app-src/css';
  const parts = readdirSync(dir).filter((f) => f.endsWith('.css')).sort();
  const text = `/*! ${NOTICE} Generated from app-src/css/. */\n` +
    parts.map((f) => readFileSync(`${dir}/${f}`, 'utf8')).join('');
  const outfile = 'app/lk.css';
  if (only) {
    const now = existsSync(outfile) ? readFileSync(outfile, 'utf8') : '';
    if (now !== text) { console.error(`${outfile}: out of date with ${dir}/. Run: node tools/build-app.mjs`); stale++; }
  } else {
    writeFileSync(outfile, text);
    console.log(`${outfile}  ←  ${dir}/ (${parts.length} files, ${text.length} bytes)`);
  }
}
process.exit(stale ? 1 : 0);

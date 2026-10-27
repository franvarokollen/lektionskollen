#!/usr/bin/env node
// Stamp a build id into the pages, so a stale copy can notice it is stale.
//
// GitHub Pages serves HTML with `cache-control: max-age=600` and gives us no
// way to change that. A substitute who opens a share link they were sent
// yesterday can get yesterday's page, with yesterday's plan layout, and nothing
// on the page knows. The link is sent once and opened later, so neither a
// versioned URL nor a service worker fixes that first load: the URL was minted
// before the deploy, and a service worker is not installed yet.
//
// So each page carries the build it was built from, and checks on load against
// app/version.txt. The check is the only reliable half — see the snippet in the
// pages for why the request cannot be served from any cache.
//
// Run before committing a change to anything under app/:
//     node tools/stamp-build.mjs
// or install the hook once:
//     ln -s ../../tools/pre-commit .git/hooks/pre-commit

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const PAGES = ['app/index.html', 'app/plan.html'];
const HASHED = [...PAGES, 'app/lk.js', 'app/lk.css', 'app/i18n.js', 'app/plan.js', 'app/plan-view.js'];
const STAMP = /(<meta name="lk-build" content=")[^"]*(">)/;

// The build id is a hash of what is actually served. Hashing the files with
// their own stamp blanked keeps it stable: stamping twice changes nothing.
const blank = (t) => t.replace(STAMP, '$1$2');
const hash = createHash('sha256');
for (const f of HASHED) hash.update(blank(readFileSync(f, 'utf8')));
const build = hash.digest('hex').slice(0, 12);

let changed = [];
for (const f of PAGES) {
  const before = readFileSync(f, 'utf8');
  if (!STAMP.test(before)) {
    console.error(`${f}: no <meta name="lk-build"> to stamp.`);
    process.exit(1);
  }
  const after = before.replace(STAMP, `$1${build}$2`);
  if (after !== before) { writeFileSync(f, after); changed.push(f); }
}

const vf = 'app/version.txt';
let vBefore = '';
try { vBefore = readFileSync(vf, 'utf8'); } catch { /* first run */ }
if (vBefore.trim() !== build) { writeFileSync(vf, build + '\n'); changed.push(vf); }

console.log(changed.length ? `Build ${build} — stamped ${changed.join(', ')}`
                           : `Build ${build} — already current.`);

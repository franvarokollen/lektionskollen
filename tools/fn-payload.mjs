// Print an edge function's files as the JSON the deploy tool wants.
//
//   node tools/fn-payload.mjs lk-generate
//
// Why this exists: deploying an edge function means handing the whole file set
// over inline, and typing those files out by hand has now gone wrong three
// times in one day. Once it put a stale copy of lk-assist into production
// while the repo had moved on. Once it double-escaped an apostrophe inside a
// single-quoted string - `phase\'s` became `phase\\'s` - and the bundler
// rejected the deploy. Once it got through: the code was right but the ── runs
// in the comment banners came out at different lengths, so the deployed file
// was not byte-identical to the repo. That last one is harmless and is exactly
// why it is dangerous - nothing fails, and "deployed matches main" quietly
// stops being true.
//
// The rule is: deploy the file, not a copy of the file. Copying generated
// output is mechanical; retyping it is not.

import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const fn = process.argv[2];
if (!fn) {
  console.error('usage: node tools/fn-payload.mjs <function-name>');
  process.exit(2);
}

const dir = new URL(`../supabase/functions/${fn}/`, import.meta.url);
let names;
try {
  names = readdirSync(dir).filter((f) => f.endsWith('.ts')).sort();
} catch {
  console.error(`No such function: supabase/functions/${fn}`);
  process.exit(2);
}
if (!names.includes('index.ts')) {
  console.error(`supabase/functions/${fn} has no index.ts`);
  process.exit(2);
}

// index.ts first, because it is the entrypoint and reads better that way.
names = ['index.ts', ...names.filter((n) => n !== 'index.ts')];

const files = names.map((name) => ({
  name,
  content: readFileSync(new URL(name, dir), 'utf8'),
}));

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
const bytes = files.reduce((a, f) => a + f.content.length, 0);
console.error(`${fn}: ${files.length} files, ${bytes} chars`);
// The hashes are the point of printing anything: after a deploy, read the
// function back and check these, rather than eyeballing a diff.
for (const f of files) {
  console.error(`  ${f.name.padEnd(12)} ${String(f.content.length).padStart(6)}  ${sha(f.content)}`);
}
console.error('');

// On stdout alone, so it can be redirected to a file and copied from there.
console.log(JSON.stringify(files));

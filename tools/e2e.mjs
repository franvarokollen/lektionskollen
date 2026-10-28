#!/usr/bin/env node
// End-to-end checks in a real browser, against the live demo school.
//
//   cd app && python3 -m http.server 8099      (in another terminal)
//   node tools/e2e.mjs [baseUrl] [shareToken]
//
// Not part of CI: it needs a browser and the shared demo database. Run it
// before a release, or after a change to how screens hand data to each other.
// Each check is a bug that has actually happened; the name says which.
//
// It never generates a plan (that costs a model call) and never saves one.

const base = (process.argv[2] || 'http://localhost:8099').replace(/\/$/, '') + '/';
const token = process.argv[3] || process.env.LK_SMOKE_TOKEN || 'f5cb4e2e7a95645ccb';

let pw;
try { pw = await import('playwright'); } catch { pw = await import('/opt/npm-tools/node_modules/playwright/index.js'); }
const { chromium } = pw.default || pw;

const b = await chromium.launch();
let bad = 0;
const ok = (name, pass, detail = '') => {
  console.log((pass ? '✓ ' : '✕ ') + name + (detail ? '  — ' + detail : ''));
  if (!pass) bad++;
};

async function page(lang = 'en') {
  const p = await b.newPage({ viewport: { width: 1300, height: 950 }, ignoreHTTPSErrors: true });
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  await p.goto(base + 'index.html?lang=' + lang);
  await p.waitForTimeout(1000);
  if (await p.$('[data-signin="demo"]')) { await p.click('[data-signin="demo"]'); await p.waitForTimeout(2500); }
  return p;
}

// ── Coordinator app ─────────────────────────────────────
{
  const p = await page('en');

  // A plan opened from the bank after closing an absence used to inherit that
  // absence's class, time and substitute.
  const blks = await p.$$('[data-blk]');
  for (const bk of blks) { await bk.click(); await p.waitForTimeout(300); if (await p.$('#cv-pop [data-planopen]')) break; }
  const opened = await p.$('#cv-pop [data-planopen]');
  if (opened) {
    await opened.click(); await p.waitForTimeout(3000);
    const metaAbsence = (await p.textContent('.addin-head .plan-meta').catch(() => '')) || '';
    await p.click('[data-close]'); await p.waitForTimeout(400);
    await p.click('[data-nav="plans"]'); await p.waitForTimeout(2500);
    const subs = await p.$$('[data-poolsub]');
    if (subs[1]) await subs[1].click();
    await p.waitForTimeout(300);
    await p.click('.pcard'); await p.waitForTimeout(3500);
    const metaBank = (await p.textContent('.addin-head .plan-meta').catch(() => '')) || '';
    const cls = (metaAbsence.split(' · ')[2] || '').trim();
    ok('bank plan does not inherit the last absence', !!metaBank && (!cls || !metaBank.includes(cls)), metaBank);
    await p.click('[data-close]'); await p.waitForTimeout(400);
  } else ok('bank plan does not inherit the last absence', true, 'skipped: no planned absence in the demo');

  // Cover blocks are buttons to a keyboard too.
  await p.click('[data-nav="cover"]'); await p.waitForTimeout(1500);
  await p.focus('[data-blk]'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok('cover block opens from the keyboard', await p.isVisible('#cv-pop').catch(() => false));
  await p.keyboard.press('Escape');

  // Switching subject twice quickly must leave the grid on the last one.
  await p.click('[data-nav="plans"]'); await p.waitForTimeout(1500);
  await p.click('.plantabs [data-tab="term"]'); await p.waitForTimeout(2500);
  await p.selectOption('#tp-subject', 'Matematik'); await p.selectOption('#tp-subject', 'Svenska');
  await p.waitForTimeout(2500);
  const h = (await p.textContent('#tp-stored h4').catch(() => '')) || '';
  ok('term grid follows the last subject chosen', /Swedish|Svenska/.test(h) && !/Mathematics|Matematik/.test(h), h);

  // A blank plan's steps add up to the lesson, even a short one.
  await p.click('.plantabs [data-tab="bank"]'); await p.waitForTimeout(1500);
  await p.click('#tab-bank [data-create]'); await p.waitForTimeout(600);
  if (await p.$('#cr-name')) { await p.fill('#cr-name', 'Test Person'); await p.click('[data-crnext]'); await p.waitForTimeout(600); }
  await p.selectOption('#cr-min', '30'); await p.click('[data-crnext]');
  await p.click('[data-crmethod="scratch"]'); await p.click('[data-crgo]'); await p.waitForTimeout(800);
  const sum = (await p.textContent('.crsum').catch(() => '')) || '';
  ok('30-minute blank plan adds up', /\b30 min\b.*\b30 min\b/.test(sum), sum);
  await p.click('[data-close]');

  ok('coordinator app: no script errors', p.errors.length === 0, p.errors.join(' | '));
  await p.close();
}

// ── Substitute page ─────────────────────────────────────
{
  const p = await b.newPage({ viewport: { width: 1200, height: 900 }, ignoreHTTPSErrors: true });
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  await p.goto(base + 'plan.html?t=' + token + '&lang=en'); await p.waitForTimeout(3500);
  const started = await p.$('.startbtn');
  if (started) {
    await started.click(); await p.waitForTimeout(800);
    // → past the last step used to need as many ← presses to come back.
    for (let i = 0; i < 12; i++) await p.keyboard.press('ArrowRight');
    const before = await p.evaluate(() => document.body.innerText.slice(0, 400));
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300);
    const after = await p.evaluate(() => document.body.innerText.slice(0, 400));
    ok('teach mode: ← moves back at once after overshooting →', before !== after);
    await p.keyboard.press('Escape'); await p.waitForTimeout(800);
    ok('Escape leaves teach mode', !(await p.$('.tvbar')));
  } else ok('teach mode', false, 'no start button — is the share token valid?');
  ok('substitute page: no script errors', p.errors.length === 0, p.errors.join(' | '));
  await p.close();
}

await b.close();
console.log(bad ? `\n${bad} check(s) failed.` : '\nAll end-to-end checks pass.');
process.exit(bad ? 1 : 0);

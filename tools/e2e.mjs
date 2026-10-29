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

async function page(lang = 'en', file = 'fvk-demo.html') {
  const p = await b.newPage({ viewport: { width: 1300, height: 950 }, ignoreHTTPSErrors: true });
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  await p.goto(base + file + '?lang=' + lang);
  await p.waitForTimeout(1000);
  if (await p.$('[data-signin="demo"]')) { await p.click('[data-signin="demo"]'); await p.waitForTimeout(2500); }
  // The FVK test page opens on its cover table; these flows start there.
  if (file === 'fvk-demo.html') { await p.click('[data-nav="cover"]').catch(() => {}); await p.waitForTimeout(1500); }
  return p;
}

// ── Coordinator app, inside the copy of FVK (fvk-demo.html) ──
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

// ── The add-on switch on the FVK test page ──────────────
{
  const p = await page('en', 'fvk-demo.html');
  ok('FVK with the add-on: two LK entries in the sidebar', !!(await p.$('[data-nav="plans"]')) && !!(await p.$('[data-nav="create"]')));
  await p.click('[data-addon="off"]'); await p.waitForTimeout(2500);
  await p.click('[data-nav="cover"]').catch(() => {}); await p.waitForTimeout(1200);
  const blk = await p.$('.blk.covered, .blk');
  if (blk) { await blk.click(); await p.waitForTimeout(300); }
  ok('FVK without the add-on: no trace of LK', !(await p.$('[data-nav="plans"]')) && !(await p.$('[data-nav="create"]')) && !(await p.$('#cv-pop [data-planopen]')));
  await p.click('[data-addon="on"]'); await p.waitForTimeout(2000);
  ok('FVK add-on back on', !!(await p.$('[data-nav="plans"]')));
  await p.close();
}

// ── Lektionskollen on its own (index.html) ──────────────
{
  const p = await page('en', 'index.html');
  const vis = (sel) => p.isVisible(sel).catch(() => false);
  ok('LK opens on the lesson plans, with no FVK screens', (await vis('#tab-bank')) && !(await p.$('#screen-cover')));

  // Today: which plans are in use. Finding a plan never offers one this class
  // has already had, and the page never mentions Frånvarokollen.
  await p.click('[data-nav="today"]'); await p.waitForTimeout(2500);
  ok('today: shows the plans-in-use page with Plan a lesson', await vis('[data-tdplan]'));
  ok('LK on its own never mentions Frånvarokollen', !/Frånvarokollen|FVK/.test(await p.innerText('body')));
  await p.click('[data-tdplan]'); await p.click('[data-tdfind]'); await p.waitForTimeout(200);
  ok('plan a lesson: a class is required', !(await p.$('.tdres')));
  await p.fill('#td-class', 'E2E-' + Date.now().toString(36));
  await p.selectOption('#td-subject', 'Matematik').catch(() => {});
  await p.click('[data-tdfind]'); await p.waitForTimeout(300);
  const picks = await p.$$eval('.tdpick .tdtop .tdst', (els) => els.map((e) => e.className));
  const firstAi = picks.findIndex((c) => c.includes('draft'));
  ok('plan a lesson: teacher-made plans come before AI-made', firstAi < 0 || !picks.slice(firstAi).some((c) => c.includes(' ok')), picks.join(','));
  ok('plan a lesson: results or a way to create one', !!(await p.$('.tdres [data-tdcreate]')));
  await p.click('[data-tdcancel]');
  // Planning ahead: the picker moves the page, and a new lesson takes the day on screen.
  await p.click('.tdpicker [data-tdday]:nth-of-type(2)'); await p.waitForTimeout(200);
  const shown = await p.inputValue('#td-day');
  const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString('sv-SE');
  await p.click('[data-tdplan]');
  ok('day picker: Next day moves the page, and Plan a lesson takes that date', shown === tomorrow && (await p.inputValue('#td-date')) === tomorrow, shown);
  await p.click('[data-tdcancel]');

  // The wizard is a page, and closing it goes back to the bank.
  await p.click('[data-nav="create"]'); await p.waitForTimeout(600);
  ok('create a plan opens as a page', (await vis('#create-page .crwiz')) && !(await vis('#overlay')));
  await p.click('#create-page [data-close]'); await p.waitForTimeout(800);
  ok('closing the wizard goes back to the bank', await vis('#tab-bank'));

  for (const [nav, sel] of [['term', '#tab-term'], ['feedback', '#tab-feedback'], ['settings', '#settings-page [data-cap]']]) {
    await p.click(`[data-nav="${nav}"]`); await p.waitForTimeout(1500);
    ok(`sidebar opens ${nav}`, await vis(sel));
  }
  ok('Lektionskollen: no script errors', p.errors.length === 0, p.errors.join(' | '));
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

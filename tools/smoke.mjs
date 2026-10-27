#!/usr/bin/env node
// Behaviour fingerprint of the app, so a rewrite can be compared with what it replaces.
//
//   node tools/smoke.mjs <outfile.json> [baseUrl]
//
// It serves nothing itself: start `python3 -m http.server 8099` in app/ first
// (baseUrl defaults to http://localhost:8099). For each screen it records the
// visible text, a count of key elements, and any console or page error, in
// Swedish and English. Build stamps and times are blanked so two runs of the
// same code give the same file; diff two files to see what a change did.
import pkg from '/opt/npm-tools/node_modules/playwright/index.js';
import { writeFileSync } from 'node:fs';
const { chromium } = pkg;
const out = process.argv[2] || 'smoke.json';
const base = process.argv[3] || 'http://localhost:8099';
const TOKEN = process.env.LK_SMOKE_TOKEN || 'sim15ccc87999';

const norm = (s) => s.replace(/\s+/g, ' ').replace(/\b\d{1,2}:\d{2}\b/g, 'HH:MM').replace(/[0-9a-f]{12}/g, 'HASH').trim();
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const res = {};

async function snap(page, name, sel = 'body') {
  const t = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const c = el.cloneNode(true);
    c.querySelectorAll('script,style,noscript').forEach((n) => n.remove());
    return c.innerText || c.textContent || '';
  }, sel);
  const counts = await page.evaluate(() => ({
    buttons: document.querySelectorAll('button').length,
    inputs: document.querySelectorAll('input,textarea,select').length,
    phases: document.querySelectorAll('.ph').length,
    tasks: document.querySelectorAll('.qa,.task').length,
    rows: document.querySelectorAll('tr').length,
  }));
  res[name] = { text: t === null ? null : norm(t), counts };
}

async function open(name, url, lang, steps) {
  const page = await b.newPage({ viewport: { width: 1450, height: 950 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|net::ERR|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript((l) => { try { localStorage.setItem('lk-lang', l); localStorage.setItem('lk_lang', l); } catch {} }, lang);
  await page.goto(base + url, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2500);
  try { await steps(page); } catch (e) { errors.push('step: ' + e.message.split('\n')[0]); }
  res[name + '#errors'] = errors;
  await page.close();
}

for (const lang of ['sv', 'en']) {
  // the substitute's page
  await open(`plan.${lang}`, `/plan.html?t=${TOKEN}&lang=${lang}`, lang, async (p) => {
    await snap(p, `plan.${lang}.view`);
    if (await p.$('[data-teach="1"]')) { await p.click('[data-teach="1"]'); await p.waitForTimeout(700); await snap(p, `plan.${lang}.teach`); }
    if (await p.$('[data-projdeck]')) { await p.click('[data-projdeck]'); await p.waitForTimeout(900); await snap(p, `plan.${lang}.projector`); }
  });
  // the coordinator's app
  await open(`app.${lang}`, `/index.html?lang=${lang}`, lang, async (p) => {
    await snap(p, `app.${lang}.cover`);
    for (const which of ['plans', 'cover']) {
      const nav = await p.$(`[data-nav="${which}"]`);
      if (nav) { await nav.click(); await p.waitForTimeout(1500); await snap(p, `app.${lang}.${which}`); }
    }
    const nav = await p.$('[data-nav="plans"]');
    if (nav) {
      await nav.click(); await p.waitForTimeout(800);
      for (const tab of await p.$$eval('[data-tab]', (els) => els.map((e) => e.getAttribute('data-tab')))) {
        await p.click(`[data-tab="${tab}"]`).catch(() => {}); await p.waitForTimeout(2500); await snap(p, `app.${lang}.tab.${tab}`);
      }
    }
    await p.click('[data-nav="cover"]').catch(() => {}); await p.waitForTimeout(800);
    const blk = await p.$('[data-blk]');
    if (blk) {
      await blk.click(); await p.waitForTimeout(600); await snap(p, `app.${lang}.popover`);
      const o = await p.$('[data-open]');
      if (o) { await o.click(); await p.waitForTimeout(1500); await snap(p, `app.${lang}.request`); }
    }
  });
}
await b.close();
writeFileSync(out, JSON.stringify(res, null, 2));
const errs = Object.entries(res).filter(([k, v]) => k.endsWith('#errors') && v.length);
console.log(`${Object.keys(res).filter((k) => !k.endsWith('#errors')).length} snapshots → ${out}`);
for (const [k, v] of errs) console.log('  ' + k + ': ' + v.join(' | '));

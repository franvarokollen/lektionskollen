#!/usr/bin/env node
// Does switching SV/EN switch everything? Switches language on every screen,
// both ways, and lists any UI string still showing in the other language.
//
//   cd app && python3 -m http.server 8099      (in another terminal)
//   node tools/lang-audit.mjs [baseUrl]
//
// Text that is part of a plan (step names, comments) is written in the plan's
// own language and may legitimately show up; everything else is a bug.
import fs from 'node:fs';
let pw;
try { pw = await import('playwright'); } catch { pw = await import('/opt/npm-tools/node_modules/playwright/index.js'); }
const { chromium } = pw.default || pw;
const BASE = (process.argv[2] || 'http://localhost:8099').replace(/\/$/, '') + '/';
let found = 0;
// UI keys whose text is also an ordinary word in plan content ("Repetition" is
// both a lesson type and a step name in Swedish plans).
const IGNORE = new Set(['typeRevision']);
global.window={}; eval(fs.readFileSync(new URL('../app/i18n.js', import.meta.url),'utf8'));
const T=window.LK_T;
const SUBJ_EN=['Mathematics','Swedish','English','Biology','Physics','Chemistry','History','Geography','Civics','Religious education','Craft and design','Design and technology','Music','Art','Home economics','Modern languages','Mother tongue tuition','Sign language','Swedish as a second language','PE','Preschool class'];
function leftovers(text, from, to){ // strings of language `from` visible while UI is in `to`
  const out=new Set();
  for(const k of Object.keys(T[from])){ if (IGNORE.has(k)) continue; const v=T[from][k], w=T[to][k]; if(typeof v!=='string'||v===w||v.length<5) continue;
    const probe=v.split('{')[0].trim(); if(probe.length<5) continue; if(text.includes(probe)) out.add(k+': '+probe.slice(0,60)); }
  if(to==='sv'){ for(const s of SUBJ_EN) if(new RegExp('(^|\\n|\\s)'+s+'(\\s|$|\\n)').test(text)) out.add('subject: '+s); if(/Year \d/.test(text)) out.add('year: Year N'); }
  return [...out];
}
{const b=await chromium.launch();
for (const [start,to] of [['en','sv'],['sv','en']]) {
const p=await b.newPage({viewport:{width:1300,height:1000},ignoreHTTPSErrors:true});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto(BASE+'fvk-demo.html?lang='+start);await p.waitForTimeout(1000);
const vis=async()=>p.evaluate(()=>document.body.innerText);
const sw=async()=>{await p.click('.sidebar [data-lang="'+to+'"]').catch(()=>{});await p.waitForTimeout(1500);};
const back=async()=>{await p.click('.sidebar [data-lang="'+start+'"]').catch(()=>{});await p.waitForTimeout(800);};
const rep=async(name)=>{await sw();const l=leftovers(await vis(),start,to);found+=l.length;console.log(`[${start}->${to}] ${name}: ${l.length?l.join(' | '):'ok'}`);await back();};
// sign-in screen: has no lang toggle; check later
await p.click('[data-signin="demo"]');await p.waitForTimeout(2500);
await p.click('[data-nav="cover"]');await p.waitForTimeout(1500); await rep('cover');
await p.click('[data-nav="plans"]');await p.waitForTimeout(2000); await rep('bank shelf');
await p.click('[data-poolview="cover"]');await p.waitForTimeout(800); await rep('bank coverage');
await p.click('[data-poolview="shelf"]');
await p.click('.plantabs [data-tab="feedback"]');await p.waitForTimeout(3000); await rep('feedback');
await p.click('.plantabs [data-tab="term"]');await p.waitForTimeout(2500); await rep('term');
await p.click('.plantabs [data-tab="bank"]');await p.waitForTimeout(1500);
await sw();
await p.click('#tab-bank [data-create]');await p.waitForTimeout(800);
const ov=async()=>p.evaluate(()=>document.getElementById('addin-content').innerText);
console.log(`[${start}->${to}] create (opened in ${to}): ${leftovers(await ov(),start,to).join(' | ')||'ok'}`);
await p.click('[data-close]').catch(()=>{});
await p.click('.pcard').catch(()=>{});await p.waitForTimeout(3500);
console.log(`[${start}->${to}] plan panel (opened in ${to}): ${leftovers(await ov(),start,to).join(' | ')||'ok'}`);
await p.click('[data-planlang="'+start+'"]').catch(()=>{});await p.waitForTimeout(800);
await p.click('[data-planlang="'+to+'"]').catch(()=>{});await p.waitForTimeout(800);
console.log(`[${start}->${to}] plan panel (toggled): ${leftovers(await ov(),start,to).join(' | ')||'ok'}`);
await p.click('[data-close]').catch(()=>{});
await p.close();
// Lektionskollen on its own: every sidebar page.
{const q=await b.newPage({viewport:{width:1300,height:1000},ignoreHTTPSErrors:true});
q.on('pageerror',e=>console.log('ERR',e.message));
await q.goto(BASE+'index.html?lang='+start);await q.waitForTimeout(1000);
await q.click('[data-signin="demo"]').catch(()=>{});await q.waitForTimeout(2500);
for (const nav of ['bank','today','create','term','feedback','settings']) {
  await q.click('[data-nav="'+nav+'"]');await q.waitForTimeout(2200);
  await q.click('.sidebar [data-lang="'+to+'"]');await q.waitForTimeout(1500);
  const l=leftovers(await q.evaluate(()=>document.body.innerText),start,to);found+=l.length;
  console.log(`[${start}->${to}] LK ${nav}: ${l.length?l.join(' | '):'ok'}`);
  await q.click('.sidebar [data-lang="'+start+'"]');await q.waitForTimeout(800);
}
await q.close();}
}
await b.close();}
process.exit(found ? 1 : 0);

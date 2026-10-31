// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
/* ── While the AI writes ──────────────────────────────────
   A real plan takes a minute or two. The old bar reached 90 % in four
   seconds and then sat there, which reads as a hang. So the wait now says
   how long it can take, shows the time passing, moves the bar on the clock
   (it creeps toward the end and never fills until the plan is back), and
   gives the eye something to do: Kollen the owl, reading and writing. */
import { esc, maybe$, t } from './lk-core';
let waitTimer: number | undefined;
const WAIT_EXPECT = 120;   // seconds, what we tell people
const OWL_SVG =
  '<svg class="owl" viewBox="0 0 140 130" aria-hidden="true">' +
    '<ellipse cx="70" cy="122" rx="44" ry="5" fill="rgba(13,35,64,.12)"/>' +
    '<g class="owl-bob">' +
      '<ellipse cx="70" cy="72" rx="36" ry="40" fill="#1b4776"/>' +
      '<path d="M40 62 Q30 80 38 100 Q46 90 46 72Z" fill="#153a62"/>' +
      '<path d="M100 62 Q110 80 102 100 Q94 90 94 72Z" fill="#153a62"/>' +
      '<ellipse cx="70" cy="84" rx="23" ry="26" fill="#e8f0fb"/>' +
      '<path d="M58 80 q4 4 8 0 M70 88 q4 4 8 0 M58 96 q4 4 8 0 M74 78 q3 3 6 0" stroke="#b8c9dc" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<circle cx="56" cy="56" r="14" fill="#fff"/><circle cx="84" cy="56" r="14" fill="#fff"/>' +
      '<g class="owl-eyes"><circle cx="56" cy="59" r="6" fill="#0d2340"/><circle cx="84" cy="59" r="6" fill="#0d2340"/>' +
        '<circle cx="58" cy="57" r="2" fill="#fff"/><circle cx="86" cy="57" r="2" fill="#fff"/></g>' +
      '<g class="owl-lids"><ellipse cx="56" cy="56" rx="15" ry="15" fill="#1b4776"/><ellipse cx="84" cy="56" rx="15" ry="15" fill="#1b4776"/></g>' +
      '<path d="M65 66 L75 66 L70 75Z" fill="#f5a524"/>' +
      '<path d="M40 34 L70 22 L100 34 L70 46Z" fill="#0d2340"/>' +
      '<path d="M52 40 L52 48 Q70 56 88 48 L88 40 L70 46Z" fill="#0d2340"/>' +
      '<path class="owl-tassel" d="M100 34 L100 50" stroke="#f5a524" stroke-width="2.5" stroke-linecap="round"/>' +
    '</g>' +
    '<path d="M30 104 Q50 96 70 104 Q90 96 110 104 L110 120 Q90 112 70 120 Q50 112 30 120Z" fill="#fff" stroke="#1b4776" stroke-width="2"/>' +
    '<line x1="70" y1="104" x2="70" y2="120" stroke="#1b4776" stroke-width="1.5"/>' +
    '<g class="owl-ink" stroke="#1b4776" stroke-width="1.6" stroke-linecap="round">' +
      '<line class="l1" x1="38" y1="106" x2="62" y2="104"/><line class="l2" x1="38" y1="111" x2="60" y2="109"/>' +
      '<line class="l3" x1="78" y1="104" x2="102" y2="106"/><line class="l4" x1="78" y1="109" x2="98" y2="111"/></g>' +
    '<g class="owl-pencil"><rect x="0" y="-2" width="22" height="5" rx="1" fill="#f5a524" transform="rotate(-35)"/>' +
      '<path d="M0 -2 L-5 0.5 L0 3Z" fill="#0d2340" transform="rotate(-35)"/></g>' +
  '</svg>';

export function waitHtml(what: string) {
  return '<div class="gen wait">' + OWL_SVG +
    '<div class="genstep" id="wait-what">' + esc(what) + '</div>' +
    '<div class="bar"><i id="wait-bar" style="width:3%"></i></div>' +
    '<div class="waitrow"><span id="wait-time" class="mono">0:00</span><span>·</span><span>' + esc(t('waitUpTo')) + '</span></div>' +
    '<p class="hint waittip" id="wait-tip">' + esc(t('waitTip1')) + '</p></div>';
}

/** Start the clock, the bar and the tips. Call stopWait() when the answer is in. */
export function startWait() {
  stopWait();
  const t0 = Date.now();
  const tips = ['waitTip1', 'waitTip2', 'waitTip3', 'waitTip4', 'waitTip5', 'waitTip6'];
  waitTimer = window.setInterval(() => {
    const sec = Math.floor((Date.now() - t0) / 1000);
    const tm = maybe$('wait-time'); if (!tm) { stopWait(); return; }
    tm.textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    // Creeps toward 95 %: about two thirds at one minute, never full.
    const pct = 3 + 92 * (1 - Math.exp(-sec / (WAIT_EXPECT * 0.6)));
    const bar = maybe$('wait-bar'); if (bar) bar.style.width = pct.toFixed(1) + '%';
    const tip = maybe$('wait-tip');
    if (tip) tip.textContent = sec > WAIT_EXPECT ? t('waitLong') : t(tips[Math.floor(sec / 8) % tips.length]!);
  }, 1000);
}

export function stopWait() { if (waitTimer) { clearInterval(waitTimer); waitTimer = undefined; } }
export function waitSay(what: string) { const el = maybe$('wait-what'); if (el) el.textContent = what; }

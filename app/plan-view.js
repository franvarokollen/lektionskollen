/* GENERATED from app-src/plan-view.entry.ts by tools/build-app.mjs. Edit the TypeScript, not this file. */
"use strict";
(() => {
  // app-src/plan-view.ts
  var esc = (s) => String(s === null || s === void 0 ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  var KINDS = ["k-recall", "k-model", "k-together", "k-indep", "k-exit"];
  var kind = (i) => KINDS[i] ?? "k-indep";
  var fill = (str, o) => String(str || "").replace(/\{(\w+)\}/g, (_m, k) => String(o[k]));
  var SKIPPABLE = { 0: true, 2: true };
  var noop = () => "";
  function render(plan, opts) {
    const p = plan || {};
    const o = opts || {};
    const t = o.lbl || ((k) => k);
    const depth = o.depth || "full";
    const assistRow = o.assistRow || noop;
    const extras = o.extras || noop;
    const flag = o.flag || noop;
    const phases = p.phases || [];
    function qa(q, a, num) {
      if (!q) return "";
      return '<div class="qa' + (num ? " num" : "") + '"><div class="q">' + esc(q) + '</div><div class="a"><b>' + esc(t("answer")) + "</b>" + esc(a || "") + "</div></div>";
    }
    function modelBlock(m) {
      if (!m || !m.p) return "";
      return '<div class="model"><div class="model-p">' + esc(m.p) + '</div><div class="model-st model-lbl"><span>' + esc(t("modelWrite")) + "</span><span>" + esc(t("modelSay")) + "</span></div>" + (m.st || []).map((st) => '<div class="model-st"><div class="model-b">' + esc(st.b || "") + '</div><div class="model-s">' + esc(st.s || "") + "</div></div>").join("") + '<div class="model-a">' + esc(t("modelAns")) + ": " + esc(m.a || "") + "</div></div>";
    }
    function tiers(tasks) {
      const order = ["support", "core", "extension"];
      const names = { support: "tierSupport", core: "tierStandard", extension: "tierChallenge" };
      const groups = order.map((k) => ({ k, items: tasks.filter((x) => (x.tier || "core") === k) })).filter((g) => g.items.length);
      if (!groups.length) return "";
      const list = (items) => '<div class="qalist">' + items.map((x) => qa(x.q, x.a, true)).join("") + "</div>";
      const only = groups[0];
      if (groups.length === 1 && only) return list(only.items);
      return '<div class="tiers">' + groups.map((g) => '<div class="tier t-' + g.k + '"><h5>' + esc(t(names[g.k])) + "</h5>" + list(g.items) + "</div>").join("") + '</div><p class="hint" style="margin:8px 0 0">' + esc(t("tierHint")) + "</p>";
    }
    function firstOpen() {
      for (let k = 0; k < phases.length; k++) {
        if (!(o.done && o.done[k])) return k;
      }
      return -1;
    }
    function clock(tt) {
      const sh = o.shiftMin || 0;
      if (!sh || !tt) return tt;
      return String(tt).replace(/(\d{1,2}):(\d{2})/g, (_m, h2, mi) => {
        const v = ((+h2 * 60 + +mi + sh) % 1440 + 1440) % 1440;
        return ("0" + Math.floor(v / 60)).slice(-2) + ":" + ("0" + v % 60).slice(-2);
      });
    }
    function phaseCard(ph, i) {
      const ref = "phase:" + i;
      const isModel = i === 1;
      const isDone = !!(o.done && o.done[i]);
      const isCur = !!o.interactive && !isDone && firstOpen() === i;
      const skip = !!(o.short && SKIPPABLE[i]);
      const stepTxt = fill(t("stepOf") || "Step {i} of {n}", { i: i + 1, n: phases.length });
      if (isDone) {
        return '<div class="ph ' + kind(i) + ' ph-done" id="ph' + i + '"><div class="ph-h"><span class="ph-n">&#10003;</span><strong>' + esc(ph.n) + '</strong><span class="ph-t">' + esc(clock(ph.t)) + '</span><button class="ph-re noprint" data-stepre="' + i + '">' + esc(t("stepReopen") || "Reopen") + "</button></div></div>";
      }
      const next = phases[i + 1];
      return '<div class="ph ' + kind(i) + (isCur ? " ph-cur" : "") + (skip ? " ph-skip" : "") + '" id="ph' + i + '"><div class="ph-step">' + esc(stepTxt) + (isCur ? " \xB7 <b>" + esc(t("stepNow") || "Now") + "</b>" : "") + (skip ? ' \xB7 <b class="canskip">' + esc(t("canSkip") || "Can skip") + "</b>" : "") + '</div><div class="ph-h"><span class="ph-n">' + (i + 1) + "</span><strong>" + esc(ph.n) + "</strong>" + flag(ref) + '<span class="ph-t">' + esc(clock(ph.t)) + "</span></div>" + (depth === "full" && ph.say ? '<div class="say"><em>' + esc(t("say")) + "</em>" + esc(ph.say) + "</div>" : "") + (isModel ? modelBlock(p.model) : "") + (i === 0 && p.recall && p.recall.why ? '<p class="meta"><b>' + esc(t("recallWhy")) + ":</b> " + esc(p.recall.why) + "</p>" : "") + // The worked example already prints its own problem and answer; printing
      // the phase's check as well said the same thing twice.
      (isModel ? "" : (ph.checks || []).map((c) => qa(c.q, c.a)).join("")) + (i === 3 ? tiers(p.tasks || []) : "") + (depth !== "brief" && ph.pupils ? '<p class="meta"><b>' + esc(t("pupils")) + "</b> " + esc(ph.pupils) + "</p>" : "") + (depth === "full" && ph.expect && ph.expect !== "\u2014" ? '<p class="meta"><b>' + esc(t("expect")) + "</b> " + esc(ph.expect) + "</p>" : "") + (o.projector && ph.board ? '<div class="strow noprint" style="margin-top:9px"><button class="stbtn presentbtn" data-proj="' + i + '"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2" width="13" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6.5 4.6v3.8L10 6.5z" fill="currentColor"/><path d="M5 14h6M8 11v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' + esc(t("projBtn")) + "</button></div>" : "") + assistRow(ref, ph.n) + extras(ref) + '<div class="ph-foot">' + (next ? '<span class="nextup">' + esc(t("nextUp") || "Next up:") + " <b>" + esc(next.n) + "</b> \xB7 " + esc(next.t) + "</span>" : '<span class="nextup">' + esc(t("lastStep") || "Last step. Then: feedback.") + "</span>") + (o.interactive ? '<button class="stbtn pri noprint" data-stepdone="' + i + '">' + esc(t("stepDone") || "Done \u2013 next step") + "</button>" : "") + "</div></div>";
    }
    if (typeof o.only === "number") {
      const at = Math.max(0, Math.min(o.only, phases.length - 1));
      const pick = phases[at];
      return pick ? phaseCard(pick, o.only) : "";
    }
    let h = "";
    const ready = o.ready || {};
    const mats = p.materials || [];
    function item(key, title, bodyHtml) {
      const done = !!ready[key];
      if (!o.interactive) {
        return '<div class="rd"><div class="rd-t"><b>' + esc(title) + "</b></div>" + bodyHtml + "</div>";
      }
      if (done) {
        return '<div class="rd rd-done"><div class="rd-t"><span class="rd-tick">&#10003;</span><b>' + esc(title) + '</b><button class="rd-btn noprint" data-ready="' + key + '">' + esc(t("readyShow") || "Show again") + "</button></div></div>";
      }
      return '<div class="rd"><div class="rd-t"><span class="rd-tick rd-empty"></span><b>' + esc(title) + '</b><button class="rd-btn rd-ok noprint" data-ready="' + key + '">' + esc(t("readyDone") || "Done \u2013 hide") + "</button></div>" + bodyHtml + "</div>";
    }
    const allReady = !!o.interactive && ready.sheet && ready.board && ready.kit;
    h += '<section class="reg reg-before" id="getready"><div class="reg-h"><span class="n">1</span>' + esc(t("getReady") || "Get ready") + '</div><p class="rd-goal"><b>' + esc(t("readyGoal") || "The goal") + ":</b> " + esc(p.goal) + "</p>" + item("board", t("readyBoard") || "Write on the board", '<div class="board">' + esc(p.board) + "</div>") + (mats.length ? item(
      "sheet",
      t("readySheet") || "Pupil sheet",
      '<p class="rd-hint">' + esc(t("readySheetHint") || "") + "</p>" + (o.interactive ? '<div class="strow noprint"><button class="stbtn pri" data-student="lesson">' + esc(t("studentSheet") || "Pupil sheet") + "</button></div>" : "") + mats.map((m) => '<div class="mat"><h5>' + esc(m.h) + "</h5><div>" + esc(m.body) + "</div></div>").join("") + assistRow("tasks", t("tasks")) + extras("tasks")
    ) : "") + item(
      "kit",
      t("readyKit") || "Gather",
      '<p class="rd-kit">' + esc(p.equipment && p.equipment.need) + '<br><span style="color:var(--ink-soft)">' + esc(p.equipment && p.equipment.fallback) + "</span></p>"
    ) + (allReady ? '<p class="rd-all">' + esc(t("readyAllDone") || "") + "</p>" : "") + "</section>";
    const first90 = p.first90 || [];
    if (depth !== "brief" && first90.length) {
      h += '<section class="reg reg-first"><div class="reg-h"><span class="n">2</span>' + esc(t("first90") || "The first 90 seconds") + '</div><ol class="f90">' + first90.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ol>" + (p.summary ? '<p class="rd-hint" style="margin:10px 0 0">' + esc(p.summary) + "</p>" : "") + "</section>";
    }
    h += '<div class="lesson-h"><h2><span class="n">3</span>' + esc(t("theLesson")) + "</h2>" + (o.interactive ? '<button class="stbtn noprint' + (o.short ? " on" : "") + '" data-short>' + esc(o.short ? t("shortOff") || "Show full" : t("shortBtn") || "Short on time?") + "</button>" : "") + "</div>" + (o.short ? '<p class="shortnote">' + esc(t("shortNote") || "") + "</p>" : "") + phases.map(phaseCard).join("");
    const misc = p.misconceptions || [];
    if (misc.length) {
      h += '<section class="reg reg-plain"><div class="reg-h reg-h-misc"><span class="n">!</span>' + esc(t("miscH")) + "</div>" + misc.map((m) => '<div class="misc"><div class="t">' + esc(m.t) + "</div>" + (m.w ? '<div class="w">' + esc(t("miscWhy")) + ": " + esc(m.w) + "</div>" : "") + '<div class="s"><b>' + esc(t("miscSay")) + "</b>" + esc(m.s) + "</div></div>").join("") + "</section>";
    }
    if (o.help !== false) h += help(p, t);
    return h;
  }
  function help(p, t) {
    return '<section class="reg reg-help"><div class="reg-h"><span class="n">?</span>' + esc(t("ifWrong")) + '</div><div class="callout"><strong>' + esc(t("stuck")) + "</strong>" + esc(p.stuck) + '</div><div class="callout"><strong>' + esc(t("ahead")) + "</strong>" + esc(p.ahead) + '</div><div class="callout"><strong>' + esc(t("wrong")) + "</strong>" + esc(p.wrong) + "</div></section>" + (p.equipment && p.equipment.where ? '<div class="nav where" style="margin-top:14px"><b>' + esc(t("whereH")) + "</b>" + esc(p.equipment.where) + "</div>" : "");
  }
  function after(p, t, extras) {
    return '<section class="reg reg-after"><div class="reg-h"><span class="n">4</span>' + esc(t("afterH")) + '</div><p style="font-size:13px;white-space:pre-wrap">' + esc(p.handover) + "</p>" + (extras ? extras("lesson") : "") + "</section>";
  }

  // app-src/plan-view.entry.ts
  window.LKPlan = { render, help, after, esc, kind };
})();

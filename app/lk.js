/* GENERATED from app-src/lk.ts by tools/build-app.mjs. Edit the TypeScript, not this file. */
"use strict";
(() => {
  // app-src/lk.ts
  var SUPABASE_URL = "https://pbamabzbfbkxajntsrmc.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiYW1hYnpiZmJreGFqbnRzcm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzU3MTEsImV4cCI6MjA5NTkxMTcxMX0.9G3-2cFOHwVqVOsIBcHomrEEclISFUaIQlg10nIlWHM";
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  function $(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error("missing #" + id);
    return el;
  }
  var maybe$ = (id) => document.getElementById(id);
  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  var esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ESC[c] ?? c);
  var LANG = (() => {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "sv" || q === "en") return q;
    try {
      return localStorage.getItem("lk.lang") === "en" ? "en" : "sv";
    } catch {
      return "sv";
    }
  })();
  var TT = window.LK_T;
  var t = (k) => TT[LANG] && TT[LANG][k] || TT.sv[k] || k;
  function setLang(l) {
    LANG = l;
    try {
      localStorage.setItem("lk.lang", l);
    } catch {
    }
    document.documentElement.lang = l;
    applyStatic();
    renderNav();
    if (state.me) $("username").textContent = state.me.role === "demo" ? t("demoRole") : state.me.role;
    renderRows();
    renderBank();
    renderFeedback();
    fillFilterOptions();
    setTitles();
    if (state.bodies) state.plan = pickBody();
    if (!$("overlay").hidden) {
      state.plan ? showPlan() : showRequest();
    }
  }
  function applyStatic() {
    document.querySelectorAll("[data-t]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-t") || "");
    });
    document.querySelectorAll("[data-lang]").forEach((b) => b.classList.toggle("on", b.getAttribute("data-lang") === LANG));
  }
  function setTitles() {
    const onPlans = state.screen === "plans";
    const onFb = onPlans && state.tab === "feedback";
    $("pagetitle").textContent = onPlans ? t("titlePlans") : t("titleCover");
    $("pagesub").textContent = onFb ? state.pending + " " + t("toReview") + " \xB7 " + state.fb.length + " " + t("plansCount") : onPlans ? state.bank.length + " " + t("plansCount") + " \xB7 " + state.bank.filter((b) => b.shared).length + " " + t("sharedBetween") : (/* @__PURE__ */ new Date()).toLocaleDateString(
      LANG === "sv" ? "sv-SE" : "en-GB",
      { weekday: "long", day: "numeric", month: "long", year: "numeric" }
    );
  }
  var ICONS = {
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M9 10h6"/>',
    radar: '<circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10"/><path d="M2 12h20"/>',
    grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
  };
  var NAV = [
    { id: "cover", icon: "users", key: "navCover", real: true },
    // One door for the add-on. The bank and the feedback queue are two views of
    // the same thing, and a second sidebar entry made it look like two features.
    { id: "plans", icon: "clipboard", key: "navPlans", real: true, addon: true, badge: true },
    { id: "hub", icon: "clipboard", key: "navHub" },
    { id: "radar", icon: "radar", key: "navRadar" },
    { id: "dash", icon: "grid", key: "navDashboard" },
    { id: "set", icon: "settings", key: "navSettings" }
  ];
  function renderNav() {
    $("nav").innerHTML = NAV.map((n) => {
      const active = n.id === state.screen;
      const stroke = active ? "#0F71F6" : "rgba(255,255,255,0.45)";
      return '<button data-nav="' + n.id + '"' + (active ? ' class="on"' : "") + '><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n.icon] + '</svg><span class="lbl">' + esc(t(n.key)) + "</span>" + (n.badge && state.pending ? '<span class="chip chip-warn" style="font-size:10px;padding:1px 6px">' + state.pending + "</span>" : "") + (n.addon && !(n.badge && state.pending) ? '<span class="chip chip-blue" style="font-size:10px;padding:1px 6px">' + esc(t("addon")) + "</span>" : "") + "</button>";
    }).join("");
  }
  var toastTimer;
  function toast(msg, ms = 4e3) {
    const box = $("toast");
    box.textContent = msg;
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      box.hidden = true;
    }, ms);
  }
  var ROWS = [
    {
      id: "abs-1",
      time: "08:20\u201309:20",
      start: "08:20",
      end: "09:20",
      mins: 60,
      teacher: "Anna Lindqvist",
      group: "Tb7a",
      raw: "Ma",
      subject: "Matematik",
      year: "\xC5k 7",
      room: "A101",
      cover: "Erik Sandberg",
      plannable: true
    },
    {
      id: "abs-2",
      time: "09:40\u201310:40",
      start: "09:40",
      end: "10:40",
      mins: 60,
      teacher: "Anna Lindqvist",
      group: "Tb7b",
      raw: "Ma",
      subject: "Matematik",
      year: "\xC5k 7",
      room: "A101",
      cover: null,
      plannable: true
    },
    {
      id: "abs-3",
      time: "10:00\u201310:45",
      start: "10:00",
      end: "10:45",
      mins: 45,
      teacher: "Johan Berg",
      group: "",
      raw: "Rast",
      subject: "\u2014",
      year: "",
      room: "Korridor B",
      cover: "Sara Nilsson",
      plannable: false,
      whyKey: "whyRast"
    },
    {
      id: "abs-4",
      time: "11:00\u201311:45",
      start: "11:00",
      end: "11:45",
      mins: 45,
      teacher: "Johan Berg",
      group: "Tb5c",
      raw: "Sv",
      subject: "Svenska",
      year: "\xC5k 5",
      room: "B204",
      cover: "Sara Nilsson",
      plannable: true
    },
    {
      id: "abs-5",
      time: "13:00\u201314:00",
      start: "13:00",
      end: "14:00",
      mins: 60,
      teacher: "Johan Berg",
      group: "Tb9a",
      raw: "En",
      subject: "Engelska",
      year: "\xC5k 9",
      room: "B204",
      cover: null,
      plannable: true
    },
    {
      id: "abs-6",
      time: "07:30\u201315:30",
      start: "07:30",
      end: "15:30",
      mins: 480,
      teacher: "Leila Haddad",
      group: "",
      raw: "Arbetstid",
      subject: "\u2014",
      year: "",
      room: "",
      cover: null,
      plannable: false,
      whyKey: "whyArbetstid"
    },
    {
      id: "abs-7",
      time: "14:15\u201315:35",
      start: "14:15",
      end: "15:35",
      mins: 80,
      teacher: "Leila Haddad",
      group: "Tb8b:SltmHT",
      raw: "Sl",
      subject: "Sl\xF6jd",
      year: "\xC5k 8",
      room: "Sl\xF6jdsal 2",
      cover: "Mats Ek",
      plannable: true,
      practical: true
    }
  ];
  var state = {
    me: null,
    row: null,
    plan: null,
    bodies: null,
    planId: null,
    view: "coordinator",
    bank: [],
    screen: "cover",
    fb: [],
    pending: 0,
    queue: [],
    model: null,
    cap: 20,
    uses: [],
    share: {},
    termCoverage: [],
    tab: "bank",
    checks: {},
    // Which shelf of the pool is open, remembered between visits.
    pool: loadPoolPick(),
    // Set once a plan is opened: who approved it and how.
    shareToken: void 0,
    approved: void 0,
    apprKind: void 0,
    apprBy: void 0,
    apprName: void 0,
    apprRank: void 0,
    apprSubject: void 0,
    apprStale: void 0
  };
  function boot() {
    document.documentElement.lang = LANG;
    applyStatic();
    renderNav();
    enterApp().then(() => Promise.all([loadFeedback(), loadUses()])).then(() => EMBED ? openEmbed() : loadCoverPlans().then(renderRows)).catch(() => {
    });
  }
  $("signout").addEventListener("click", () => location.reload());
  async function enterApp() {
    const { data, error } = await sb.rpc("lk_me");
    if (error) {
      document.body.innerHTML = '<p style="padding:40px;font:14px Geist,sans-serif">' + esc(t("errDb")) + " " + esc(error.message) + "</p>";
      return;
    }
    if (!data || !data.school_id) {
      document.body.innerHTML = '<p style="padding:40px;font:14px Geist,sans-serif">Demoskolan saknas i databasen.</p>';
      return;
    }
    state.me = data;
    $("app").hidden = false;
    $("schoolname").textContent = data.school;
    $("username").textContent = data.role === "demo" ? "Delad testmilj\xF6" : data.role;
    $("pagesub").textContent = (/* @__PURE__ */ new Date()).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    renderRows();
    loadBank();
  }
  var LOUD = (() => {
    try {
      return localStorage.getItem("lk.loud") || "marked";
    } catch {
      return "marked";
    }
  })();
  function setLoud(v) {
    LOUD = v;
    try {
      localStorage.setItem("lk.loud", v);
    } catch {
    }
    renderRows();
    renderLoudPicker();
  }
  function renderLoudPicker() {
    const el = maybe$("cv-loud");
    if (!el) return;
    el.innerHTML = '<span class="lbl">' + esc(t("cvHow")) + "</span>" + [["quiet", "cvQuiet"], ["marked", "cvMarked"], ["nudge", "cvNudge"]].map(([v, k]) => '<button class="' + (LOUD === v ? "on" : "") + '" data-loud="' + v + '">' + esc(t(k)) + "</button>").join("") + '<span class="hint">' + esc(t("cvHowNote")) + "</span>";
  }
  var PLANS = {};
  function planFor(ref) {
    return PLANS[ref] || null;
  }
  function planSettled(ref) {
    const p = planFor(ref);
    return !!p;
  }
  async function loadCoverPlans() {
    const { data } = await sb.rpc("lk_cover_plans");
    PLANS = data || {};
  }
  var POP = null;
  function closePop() {
    POP = null;
    $("cv-pop").hidden = true;
  }
  function openPop(ref, x, y) {
    const r = ROWS.find((b) => b.id === ref);
    if (!r) return;
    POP = ref;
    const plan = planFor(ref);
    const el = $("cv-pop");
    const planBtn = r.plannable ? planRow(r, plan) : '<p class="pnote">' + esc(t(r.whyKey || "whyRast")) + "</p>";
    el.innerHTML = '<div class="pophead"><p class="ph">' + esc([r.group, r.subject].filter(Boolean).join(" ") || r.raw) + (r.room ? '<span class="rm">' + esc(r.room) + "</span>" : "") + '</p><p class="pm">' + esc(t("cvWas")) + ": " + esc(r.teacher) + " \u2022 " + esc(r.time) + " \u2022 " + r.mins + " min</p></div>" + (r.cover ? '<div class="poprow"><span class="covpill">\u2713 ' + esc(r.cover) + '</span><span class="popicons"><button disabled title="' + esc(t("cvNotify")) + '">\u2709</button><button disabled title="' + esc(t("cvRemove")) + '">\xD7</button></span></div>' : '<div class="poprow"><select disabled><option>' + esc(t("cvAssign")) + "</option></select></div>") + planBtn;
    el.hidden = false;
    if (window.innerWidth < 640) {
      el.style.left = "";
      el.style.top = "";
      return;
    }
    const w = 300, hGuess = 190;
    el.style.left = Math.min(x, window.innerWidth - w - 12) + "px";
    el.style.top = Math.min(y, window.innerHeight - hGuess - 12) + "px";
  }
  async function checkPlan(id) {
    if (state.checks[id] !== void 0) return state.checks[id];
    try {
      const { data, error } = await sb.functions.invoke("lk-verify", { body: { plan_id: id } });
      state.checks[id] = error ? null : data;
    } catch {
      state.checks[id] = null;
    }
    return state.checks[id];
  }
  function checkBanner(v) {
    if (!v) return "";
    if (v.ok && !v.warnings) {
      return '<div class="flag chk ok"><span>\u2713</span><div>' + esc(t("chkClean")) + (v.subject_checked ? " " + esc(t("chkSubject")) : "") + "</div></div>";
    }
    const lines = (v.problems || []).map((p) => '<li class="' + (p.level === "blocker" ? "bad" : "warn") + '"><b>' + esc(p.where) + "</b> \u2014 " + esc(p.detail) + "</li>").join("");
    return '<div class="flag chk ' + (v.ok ? "warn" : "bad") + '"><span>' + (v.ok ? "!" : "\u2715") + "</span><div><b>" + esc(v.ok ? fillT("chkWarnings", { n: v.warnings }) : fillT("chkBlockers", { n: v.blockers })) + "</b> " + esc(v.ok ? t("chkWarnBody") : t("chkBlockBody")) + '<ul class="chklist">' + lines + "</ul></div></div>";
  }
  function planRow(r, p) {
    if (!p) {
      return '<div class="planrow"><span class="plbl">' + esc(t("cvMakePlan")) + '</span><button class="plopt" data-planopen="' + esc(r.id) + '">' + esc(t("cvPlMake")) + '</button><button class="plopt" data-planlink="' + esc(r.id) + '">' + esc(t("cvPlLink")) + '</button><button class="plopt quiet" data-plannot="' + esc(r.id) + '">' + esc(t("cvPlNot")) + "</button></div>";
    }
    if (p.kind === "not_needed") {
      return '<div class="planrow done"><span class="plbl">' + esc(t("cvPlNotSet")) + '</span><button class="plopt quiet" data-planclear="' + esc(r.id) + '">' + esc(t("cvPlUndo")) + "</button></div>";
    }
    if (p.kind === "generated") {
      return '<button class="planbtn ' + (p.approved ? "done" : "draft") + '" data-planopen="' + esc(r.id) + '"><span>' + (p.approved ? "\u2713" : "\u{1F4C4}") + "</span>" + esc(p.approved ? t("cvOpenPlan") : t("cvPlReview")) + "</button>";
    }
    const what = p.label || (p.kind === "note" ? t("cvPlNoteKind") : hostOf(p.url) || t("cvPlLinkKind"));
    const expLine = p.expires_at ? '<div class="planrow"><span class="plbl">' + esc(p.expired ? t("cvPlExpired") : t("cvPlUntil") + " " + new Date(new Date(p.expires_at).getTime() - 1e3).toLocaleDateString(LANG === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" })) + "</span>" + (p.expired ? "" : '<button class="plopt quiet" data-planextend="' + esc(r.id) + '">' + esc(t("cvPlExtend")) + "</button>") + "</div>" : "";
    return '<button class="planbtn linked" data-planopen="' + esc(r.id) + '"><span>\u{1F517}</span>' + esc(t("cvPlTeachers")) + " \u2014 " + esc(what) + "</button>" + expLine + '<div class="planrow"><button class="plopt quiet" data-planlink="' + esc(r.id) + '">' + esc(t("cvPlChange")) + '</button><button class="plopt quiet" data-planclear="' + esc(r.id) + '">' + esc(t("cvPlRemove")) + "</button></div>";
  }
  function hostOf(url) {
    try {
      return new URL(url || "").hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }
  function openLinkBox(ref) {
    const r = ROWS.find((b) => b.id === ref);
    if (!r) return;
    const p = planFor(ref) || {};
    closePop();
    $("linkbox").innerHTML = '<div class="lbx"><h3>' + esc(t("cvPlLinkTitle")) + '</h3><p class="hint">' + esc(blockTitle(r)) + " \xB7 " + esc(r.time) + " \xB7 " + esc(r.teacher) + '</p><label class="f full">' + esc(t("cvPlUrl")) + '<input id="lb-url" type="url" placeholder="https://\u2026" value="' + esc(p.url || "") + '"></label><p class="linkstate" id="lb-state" hidden></p><label class="f full">' + esc(t("cvPlNoteLbl")) + '<textarea id="lb-note" rows="3" placeholder="' + esc(t("cvPlNotePh")) + '">' + esc(p.note || "") + '</textarea></label><label class="f full">' + esc(t("cvPlLabel")) + '<input id="lb-label" maxlength="60" placeholder="' + esc(t("cvPlLabelPh")) + '" value="' + esc(p.label || "") + '"></label><p class="hint">' + esc(t("cvPlWrapNote")) + '</p><div class="lbxfoot"><button class="btn btn-ghost btn-sm" data-lbcancel>' + esc(t("cancel")) + '</button><button class="btn btn-primary btn-sm" data-lbsave="' + esc(ref) + '">' + esc(t("save")) + "</button></div></div>";
    $("linkbox").hidden = false;
    const urlField = $("lb-url");
    urlField.addEventListener("blur", () => checkLink(urlField.value));
    if (p.url) checkLink(p.url);
  }
  async function checkLink(url) {
    const box = maybe$("lb-state");
    if (!box) return;
    const u = (url || "").trim();
    if (!u) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    box.className = "linkstate busy";
    box.textContent = t("lkChecking");
    let r;
    try {
      const { data, error } = await sb.functions.invoke("lk-checklink", { body: { url: u } });
      r = error ? { status: "unreachable" } : data;
    } catch {
      r = { status: "unreachable" };
    }
    const map = {
      ok: ["ok", "lkOk"],
      missing: ["bad", "lkMissing"],
      private: ["warn", "lkPrivate"],
      slow: ["warn", "lkSlow"],
      unreachable: ["warn", "lkUnreachable"],
      bad: ["bad", r && r.reason === "not_http" ? "lkNotHttp" : r && r.reason === "private_address" ? "lkPrivateAddr" : "lkNotUrl"]
    };
    const m = map[r && r.status || "unreachable"] || map.unreachable;
    box.className = "linkstate " + m[0];
    box.textContent = t(m[1]);
  }
  async function saveLink(ref) {
    const url = $("lb-url").value.trim();
    const note = $("lb-note").value.trim();
    const label = $("lb-label").value.trim();
    if (!url && !note) {
      toast(t("cvPlNeedOne"));
      return;
    }
    const { error } = await sb.rpc("lk_set_cover_plan", {
      p_absence_ref: ref,
      p_kind: url ? "linked" : "note",
      p_url: url || null,
      p_note: note || null,
      p_label: label || null
    });
    if (error) {
      toast(error.message);
      return;
    }
    $("linkbox").hidden = true;
    await loadCoverPlans();
    renderRows();
    toast(t("cvPlSaved"));
  }
  function openPlanPanel(ref) {
    const r = ROWS.find((b) => b.id === ref);
    if (!r) return;
    const p = planFor(ref);
    if (p && (p.kind === "linked" || p.kind === "note")) {
      closePop();
      window.open(planUrl(p.share_token), "_blank", "noopener");
      return;
    }
    closePop();
    document.body.classList.add("panelmode");
    if (p && p.kind === "generated" && p.plan_id) {
      state.row = r;
      usePlan(p.plan_id);
      return;
    }
    openAddin(ref);
  }
  var GRID = { gutter: 54, colMin: 150, pxPerHour: 76 };
  function hhmmToMins(t2) {
    const [h, m] = String(t2 || "0:0").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  function gridModel() {
    const cols = [];
    ROWS.forEach((r) => {
      let c = cols.find((x) => x.teacher === r.teacher);
      if (!c) {
        c = { teacher: r.teacher, blocks: [] };
        cols.push(c);
      }
      c.blocks.push(r);
    });
    const all = ROWS.map((r) => [hhmmToMins(r.start), hhmmToMins(r.end)]);
    const from = Math.floor(Math.min(...all.map((x) => x[0])) / 60) * 60;
    const to = Math.ceil(Math.max(...all.map((x) => x[1])) / 60) * 60;
    const marks = [];
    for (let m = from; m <= to; m += 60) marks.push(m);
    return { cols, from, to, span: Math.max(1, to - from), marks };
  }
  function coverageStats() {
    const plannable = ROWS.filter((r) => r.plannable);
    const covered = plannable.filter((r) => r.cover).length;
    const teachers = new Set(ROWS.map((r) => r.teacher)).size;
    return {
      total: plannable.length,
      covered,
      uncovered: plannable.length - covered,
      absent: teachers,
      pct: plannable.length ? Math.round(covered / plannable.length * 100) : 0
    };
  }
  function donut(pct) {
    const size = 72, sw = 7, r = (size - sw) / 2, c = 2 * Math.PI * r;
    return '<circle cx="36" cy="36" r="' + r + '" fill="none" stroke="' + (pct === 0 ? "#e5e7eb" : "#fecaca") + '" stroke-width="' + sw + '"/>' + (pct > 0 ? '<circle cx="36" cy="36" r="' + r + '" fill="none" stroke="#16a34a" stroke-width="' + sw + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + c * (1 - pct / 100) + '" stroke-linecap="round" transform="rotate(-90 36 36)"/>' : "") + '<text x="36" y="32" text-anchor="middle" font-size="20" font-weight="700" fill="var(--ink)">' + pct + '%</text><text x="36" y="48" text-anchor="middle" font-size="8" font-weight="600" fill="' + (pct >= 100 ? "#16a34a" : "var(--ink-soft)") + '" letter-spacing="0.5">' + esc(t("cvCovered").toUpperCase()) + "</text>";
  }
  function renderRows() {
    const st = coverageStats();
    const d = /* @__PURE__ */ new Date("2026-10-21T12:00:00");
    const loc = LANG === "sv" ? "sv-SE" : "en-GB";
    $("cv-kicker").textContent = t("cvToday") + " \xB7 " + t("cvWeek") + " 43";
    $("cv-day").innerHTML = esc(d.toLocaleDateString(loc, { weekday: "long" })) + " <b>" + d.getDate() + "</b> " + esc(d.toLocaleDateString(loc, { month: "long" }));
    $("cv-donut").innerHTML = donut(st.pct);
    $("cv-need").textContent = st.uncovered ? st.uncovered + " " + t(st.uncovered === 1 ? "cvLesson" : "cvLessons") + " " + t("cvNeedCover") : t("cvAllCovered");
    $("cv-counts").textContent = st.absent + " " + t("cvAbsent") + " \xB7 " + st.total + " " + t("cvLessons") + " \xB7 " + st.covered + " " + t("cvCovered");
    const g = gridModel();
    $("cv-chips").innerHTML = g.cols.map((c) => {
      const mine = c.blocks.filter((b) => b.plannable);
      const cov = mine.filter((b) => b.cover).length;
      const all = mine.length > 0 && cov === mine.length;
      return '<div class="schip' + (all ? " done" : "") + '"><span class="sname">' + esc(c.teacher) + "</span>" + (mine.length ? '<span class="sstat' + (all ? " ok" : "") + '">' + (all ? "\u2713 " + esc(t("cvChipCovered")) : cov + "/" + mine.length + " " + esc(t("cvChipCoveredN"))) + '</span><span class="sbar"><i class="' + (all ? "ok" : "") + '" style="width:' + Math.round(cov / mine.length * 100) + '%"></i></span>' : '<span class="sstat">' + esc(t("cvChipAbsent")) + "</span>") + (all ? '<span class="stick">\u2713</span>' : "") + "</div>";
    }).join("");
    const gap = ROWS.filter((r) => r.plannable && r.cover && !planSettled(r.id)).length;
    $("cv-nudge").hidden = !(LOUD === "nudge" && gap > 0);
    if (LOUD === "nudge" && gap > 0) {
      $("cv-nudge").innerHTML = "<span>\u{1F4C4}</span><div>" + esc(fillT("cvGapLine", { n: gap === 1 ? t("cvGap1") : fillT("cvGapN", { n: gap }) })) + '</div><button class="btn btn-soft btn-sm" data-planfirst>' + esc(t("cvGapBtn")) + "</button>";
    }
    renderLoudPicker();
    const h = Math.round(g.span / 60 * GRID.pxPerHour);
    const top = (m) => (m - g.from) / g.span * 100;
    const lines = g.marks.map((m) => '<div class="hline" style="top:' + top(m) + '%"></div>').join("");
    $("cv-grid").style.minWidth = GRID.gutter + g.cols.length * GRID.colMin + "px";
    $("cv-grid").innerHTML = '<div class="gutter" style="width:' + GRID.gutter + 'px"><div class="colhead"></div><div class="canvas" style="height:' + h + 'px">' + g.marks.map((m) => '<span class="hmark" style="top:calc(' + top(m) + '% - 6px)">' + minsToHHMM(m) + "</span>").join("") + '</div></div><div class="cols">' + g.cols.map((c) => '<div class="col" style="min-width:' + GRID.colMin + 'px"><div class="colhead"><span>' + esc(c.teacher) + '</span></div><div class="canvas" style="height:' + h + 'px">' + lines + c.blocks.map((b) => blockHtml(b, g, h)).join("") + "</div></div>").join("") + "</div>";
  }
  function blockTitle(b) {
    const parts = [b.group, b.subject].filter((x) => x && x !== "\u2014");
    return parts.length ? parts.join(" ") : b.raw;
  }
  function planMark(p) {
    const marks = {
      generated: p.approved ? ["\u2713", "ok", "cvHasPlan"] : ["\u25CB", "", "cvPlanDraft"],
      linked: ["\u{1F517}", "ok", "cvHasLinked"],
      note: ["\u{1F517}", "ok", "cvHasNote"],
      authored: ["\u2713", "ok", "cvHasLinked"],
      not_needed: null
    };
    const m = marks[p.kind];
    if (!m) return "";
    return '<span class="bplan ' + m[1] + '" title="' + esc(t(m[2])) + '">' + m[0] + "</span>";
  }
  function minsToHHMM(m) {
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  }
  function blockHtml(b, g, gridH) {
    const s = hhmmToMins(b.start), e = hhmmToMins(b.end);
    const topPct = (s - g.from) / g.span * 100;
    const hPct = (e - s) / g.span * 100;
    const px = hPct / 100 * gridH;
    const status = !b.plannable ? "nonteach" : b.cover ? "covered" : "uncovered";
    const plan = planFor(b.id);
    return '<div class="blk ' + status + '" role="button" tabindex="0" data-blk="' + esc(b.id) + '" style="top:calc(' + topPct + "% + 1px);height:calc(" + hPct + '% - 3px);min-height:22px" title="' + esc([b.group, b.subject].filter(Boolean).join(" ") + " \xB7 " + b.time + (b.cover ? " \xB7 \u2713 " + b.cover : "")) + '"><p class="bt">' + esc(blockTitle(b)) + "</p>" + (px >= 34 ? '<p class="bm">' + esc(b.time) + "</p>" : "") + (px >= 48 && b.cover ? '<p class="bc">\u2713 ' + esc(b.cover) + "</p>" : "") + (plan && LOUD !== "quiet" && px >= 30 ? planMark(plan) : "") + "</div>";
  }
  var SUBJECTS_EN = {
    "Matematik": "Mathematics",
    "Svenska": "Swedish",
    "Engelska": "English",
    "Biologi": "Biology",
    "Fysik": "Physics",
    "Kemi": "Chemistry",
    "Historia": "History",
    "Geografi": "Geography",
    "Samh\xE4llskunskap": "Civics",
    "Religionskunskap": "Religious education",
    "Idrott": "PE",
    "Idrott och h\xE4lsa": "PE",
    "Sl\xF6jd": "Craft and design",
    "Teknik": "Design and technology",
    "Musik": "Music",
    "Bild": "Art",
    "Hem- och konsumentkunskap": "Home economics",
    "Moderna spr\xE5k": "Modern languages",
    "Spanska": "Spanish",
    "Tyska": "German",
    "Franska": "French",
    "NO": "Science",
    "SO": "Humanities",
    "Svenska som andraspr\xE5k": "Swedish as a second language",
    "Modersm\xE5l": "Mother tongue tuition",
    "Teckenspr\xE5k f\xF6r h\xF6rande": "Sign language",
    "Elevens val": "Pupil's choice"
  };
  var CATALOG_YEARS = ["F", "\xC5k 1", "\xC5k 2", "\xC5k 3", "\xC5k 4", "\xC5k 5", "\xC5k 6", "\xC5k 7", "\xC5k 8", "\xC5k 9"];
  var CATALOG_SUBJECTS = [
    "Matematik",
    "Svenska",
    "Svenska som andraspr\xE5k",
    "Engelska",
    "Moderna spr\xE5k",
    "Biologi",
    "Fysik",
    "Kemi",
    "Teknik",
    "Geografi",
    "Historia",
    "Religionskunskap",
    "Samh\xE4llskunskap",
    "Idrott och h\xE4lsa",
    "Musik",
    "Bild",
    "Sl\xF6jd",
    "Hem- och konsumentkunskap",
    "Modersm\xE5l",
    "Teckenspr\xE5k f\xF6r h\xF6rande"
  ];
  var SUBJECT_ALIAS = {
    "idrott": "Idrott och h\xE4lsa",
    "hemkunskap": "Hem- och konsumentkunskap",
    "hkk": "Hem- och konsumentkunskap",
    "sva": "Svenska som andraspr\xE5k",
    "religion": "Religionskunskap"
  };
  function canonSubject(s) {
    const k = String(s || "").trim();
    return SUBJECT_ALIAS[k.toLowerCase()] || k;
  }
  function canonYear(y) {
    const k = String(y || "").trim();
    if (/^(f|fsk|f-klass|förskoleklass|forskoleklass)$/i.test(k)) return "F";
    const m = /^(?:åk|ak|årskurs)\s*(\d+)$/i.exec(k);
    return m ? "\xC5k " + m[1] : k;
  }
  function subjectLabel(s) {
    if (LANG !== "en" || !s) return s || "";
    return SUBJECTS_EN[s] || s;
  }
  function yearLabel(y) {
    if (y === "F") return LANG === "en" ? "Preschool class" : "F\xF6rskoleklass";
    if (LANG !== "en" || !y) return y || "";
    const m = /^\s*Åk\s*(\d+)/.exec(y);
    return m ? "Year " + m[1] : y;
  }
  async function loadBank() {
    const scope = $("f-scope").value || "all";
    const approval = $("f-approval").value || "any";
    const { data, error } = await sb.rpc(
      "lk_pool",
      { p_subject: null, p_year: null, p_scope: scope, p_approval: approval }
    );
    if (error) {
      $("bankgrid").innerHTML = '<p class="note">' + esc(t("errBank")) + " " + esc(error.message) + "</p>";
      return;
    }
    state.bank = data || [];
    fillFilterOptions();
    renderBank();
  }
  function fillFilterOptions() {
    const fixed = (el, want) => {
      const cur = el.value || want[0][0];
      if (el.options.length !== want.length || el.options[0]?.text !== want[0][1]) {
        el.innerHTML = want.map(([v, l]) => '<option value="' + v + '">' + esc(l) + "</option>").join("");
        el.value = cur;
      }
    };
    fixed($("f-scope"), [["all", t("allSources")], ["mine", t("ourSchool")], ["shared", t("sharedOnly")]]);
    fixed($("f-approval"), [
      ["any", t("filtAnyAppr")],
      ["approved", t("filtApproved")],
      ["teacher", t("filtTeacher")],
      ["qualified", t("filtQualified")]
    ]);
  }
  function rowTitle(b) {
    if (b.language_alt === LANG && b.title_alt) return b.title_alt;
    return b.title;
  }
  function stars(r) {
    const n = Math.round(Number(r) || 0);
    return "\u2605\u2605\u2605\u2605\u2605".slice(0, n) + "\u2606\u2606\u2606\u2606\u2606".slice(0, 5 - n);
  }
  function yearNum(y) {
    if (String(y || "").trim() === "F") return 0;
    const m = /(\d+)/.exec(String(y || ""));
    return m ? Number(m[1]) : Infinity;
  }
  var SUBJECT_PALETTE = [
    "#2563eb",
    "#059669",
    "#d97706",
    "#dc2626",
    "#7c3aed",
    "#0891b2",
    "#db2777",
    "#65a30d",
    "#ea580c",
    "#4f46e5"
  ];
  var APPR_MAX = 3;
  function apprLevelName(n) {
    return t("apLvl" + n);
  }
  function apprStars(rank, who, bare) {
    const n = Math.max(0, Math.min(APPR_MAX, Number(rank) || 0));
    const tip = fillT("apLevel", { n, l: apprLevelName(n) }) + (who ? " \xB7 " + who : "");
    let s = "";
    for (let i = 1; i <= APPR_MAX; i++) s += '<i class="' + (i <= n ? "on" : "off") + '">\u2605</i>';
    return '<span class="apstars r' + n + '" role="img" aria-label="' + esc(tip) + '" title="' + esc(tip) + '">' + s + (bare ? "" : "<b>" + n + "/" + APPR_MAX + "</b>") + "</span>";
  }
  function bankCard(b, withYear) {
    const st = b.st || {};
    const sc = st.score != null ? Math.round(st.score * 100) : null;
    const n = st.n || 0;
    const rank = b.approved ? Number(b.approval_rank) || 0 : 0;
    const who = [b.approved_name, rank >= 2 && b.approved_subject ? subjectLabel(b.approved_subject) : ""].filter(Boolean).join(", ");
    const status = apprStars(rank, who) + (!b.approved ? '<span class="chip chip-warn">' + esc(t("notApproved")) + "</span>" : b.approval_stale ? '<span class="chip chip-warn">' + esc(t("chipStale")) + "</span>" : '<span class="aplvl">' + esc(apprLevelName(rank)) + "</span>");
    const score = !b.approved ? "" : n ? '<span class="pc-score ' + (sc >= 75 ? "hi" : sc >= 55 ? "mid" : sc >= 40 ? "lo" : "bad") + '">' + sc + '</span><span class="pc-n">' + esc(fillT(n === 1 ? "scOne" : "scMany", { n })) + "</span>" : '<span class="pc-new">' + esc(t("scNew")) + "</span>";
    return '<div class="bcard pcard clickable" data-viewplan="' + b.id + '"><div class="pc-head"><h4>' + esc(rowTitle(b)) + "</h4>" + (b.approved ? '<button class="pc-copy" data-copylink="' + esc(b.share_token) + '" title="' + esc(t("copyLink")) + '">' + CHK + "</button>" : "") + '</div><p class="pc-meta">' + (withYear ? '<span class="pc-yr">' + esc(yearLabel(b.year_group)) + "</span> \xB7 " : "") + b.minutes + " " + esc(t("min")) + (b.mine ? "" : " \xB7 " + esc(b.school || "")) + '</p><div class="pc-status">' + status + score + "</div>" + usedLine(b.id) + "</div>";
  }
  function loadPoolPick() {
    try {
      const v = JSON.parse(localStorage.getItem("lk.pool") || "{}");
      return { view: v.view === "cover" ? "cover" : "shelf", sub: String(v.sub || ""), yr: String(v.yr || "") };
    } catch {
      return { view: "shelf", sub: "", yr: "" };
    }
  }
  function savePoolPick() {
    try {
      localStorage.setItem("lk.pool", JSON.stringify(state.pool));
    } catch {
    }
  }
  function groupPool(rows) {
    const bySubject = /* @__PURE__ */ new Map();
    for (const b of rows) {
      const sub = canonSubject(b.subject);
      if (!bySubject.has(sub)) bySubject.set(sub, /* @__PURE__ */ new Map());
      const years = bySubject.get(sub);
      const yr = canonYear(b.year_group);
      if (!years.has(yr)) years.set(yr, []);
      years.get(yr).push(b);
    }
    return bySubject;
  }
  var byLabelSv = (fmt) => (a, b) => fmt(a).localeCompare(fmt(b), LANG === "en" ? "en" : "sv");
  function sortYears(ys) {
    return ys.slice().sort((a, b) => yearNum(a) - yearNum(b) || byLabelSv(yearLabel)(a, b));
  }
  function poolViewToggle() {
    const v = state.pool.view;
    const box = maybe$("poolview");
    if (!box) return;
    box.innerHTML = '<button class="' + (v === "shelf" ? "on" : "") + '" data-poolview="shelf">' + esc(t("poolShelf")) + '</button><button class="' + (v === "cover" ? "on" : "") + '" data-poolview="cover">' + esc(t("poolCover")) + "</button>";
  }
  function renderBank() {
    const g = $("bankgrid");
    poolViewToggle();
    if (!state.bank.length) {
      const scope = maybe$("f-scope")?.value;
      const appr = maybe$("f-approval")?.value;
      g.innerHTML = '<p class="note">' + esc(
        appr === "qualified" ? t("bankNoneQualified") : appr === "teacher" ? t("bankNoneTeacher") : scope === "shared" ? t("bankNoneShared") : t("bankEmpty")
      ) + "</p>";
      return;
    }
    const bySubject = groupPool(state.bank);
    const subjects = [...bySubject.keys()].sort(byLabelSv(subjectLabel));
    const acc = (sub2) => SUBJECT_PALETTE[Math.max(0, subjects.indexOf(sub2)) % SUBJECT_PALETTE.length];
    if (state.pool.view === "cover") {
      g.innerHTML = poolCoverage(bySubject);
      return;
    }
    let sub = state.pool.sub;
    if (!bySubject.has(sub)) sub = subjects[0];
    const years = bySubject.get(sub);
    let yr = state.pool.yr;
    if (yr && !years.has(yr)) yr = "";
    state.pool.sub = sub;
    state.pool.yr = yr;
    const rail = '<nav class="poolrail" aria-label="' + esc(t("subjectLbl")) + '">' + subjects.map((s) => {
      const n = [...bySubject.get(s).values()].reduce((a, x) => a + x.length, 0);
      return '<button class="' + (s === sub ? "on" : "") + '" style="--acc:' + acc(s) + '" data-poolsub="' + esc(s) + '"><span class="dot"></span><span class="l">' + esc(subjectLabel(s)) + '</span><span class="n">' + n + "</span></button>";
    }).join("") + "</nav>";
    const order = sortYears([...years.keys()]);
    const total = [...years.values()].reduce((a, x) => a + x.length, 0);
    const chip = (v, label, n) => '<button class="' + (v === yr ? "on" : "") + '" data-poolyr="' + esc(v) + '">' + esc(label) + ' <span class="n">' + n + "</span></button>";
    const chips = '<div class="yrchips">' + chip("", t("allYears"), total) + order.map((y) => chip(y, yearLabel(y), years.get(y).length)).join("") + "</div>";
    const shelf = '<div class="poolyear"><div class="grid">' + (yr ? years.get(yr).map((b) => bankCard(b)) : order.flatMap((y) => years.get(y).map((b) => bankCard(b, true)))).join("") + "</div></div>";
    g.innerHTML = '<div class="poolwrap">' + rail + '<section class="poolsub poolmain" style="--acc:' + acc(sub) + '"><h3><span class="dot"></span>' + esc(subjectLabel(sub)) + '<span class="n">' + total + "</span></h3>" + chips + shelf + "</section></div>";
  }
  function poolCoverage(bySubject) {
    const subs = [.../* @__PURE__ */ new Set([...CATALOG_SUBJECTS, ...bySubject.keys()])].sort(byLabelSv(subjectLabel));
    const present = [...bySubject.values()].flatMap((m) => [...m.keys()]);
    const yrs = sortYears([.../* @__PURE__ */ new Set([...CATALOG_YEARS, ...present])]);
    const head = "<tr><th></th>" + yrs.map((y) => "<th>" + esc(y === "F" ? "F" : yearLabel(y).replace(/^\D+/, "")) + "</th>").join("") + "</tr>";
    const body = subs.map((s) => {
      const years = bySubject.get(s);
      return "<tr><th>" + esc(subjectLabel(s)) + "</th>" + yrs.map((y) => {
        const rows = years?.get(y) || [];
        if (!rows.length) return '<td><span class="cv empty" title="' + esc(t("poolCellEmpty")) + '">\xB7</span></td>';
        const ok = rows.filter((b) => b.approved && !b.approval_stale).length;
        const tip = fillT("poolCellTip", { n: rows.length, a: ok }) + " \u2014 " + subjectLabel(s) + ", " + yearLabel(y);
        return '<td><button class="cv ' + (ok ? rows.length >= 3 ? "full" : "some" : "unappr") + '" data-poolcell="' + esc(s) + "|" + esc(y) + '" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">' + rows.length + "</button></td>";
      }).join("") + "</tr>";
    }).join("");
    return '<div class="poolcov"><table>' + head + body + '</table></div><p class="cvlegend"><span class="cv full">3</span>' + esc(t("poolLegFull")) + '<span class="cv some">1</span>' + esc(t("poolLegSome")) + '<span class="cv unappr">1</span>' + esc(t("poolLegUnappr")) + '<span class="cv empty">\xB7</span>' + esc(t("poolCellEmpty")) + "</p>";
  }
  function openShelf(sub, yr) {
    if (sub != null) state.pool.sub = sub;
    if (yr != null) state.pool.yr = yr;
    state.pool.view = "shelf";
    savePoolPick();
    renderBank();
  }
  function fillT(k, o) {
    return t(k).replace(/\{(\w+)\}/g, (_m, x) => String(o[x]));
  }
  async function shareWhy(id, box) {
    if (!state.share[id]) {
      const { data, error } = await sb.rpc("lk_plan_standing", { p_id: id });
      if (error || !data) {
        box.innerHTML = '<p class="hint">' + esc(error && error.message || "\u2014") + "</p>";
        return;
      }
      state.share[id] = data;
    }
    const d = state.share[id];
    const row = (pass, text, detail) => '<li class="' + (pass ? "pass" : "fail") + '"><span>' + (pass ? "\u2713" : "\u2715") + "</span><div>" + esc(text) + (detail ? '<br><span class="muted">' + esc(detail) + "</span>" : "") + "</div></li>";
    const b = state.bank.find((x) => x.id === id) || {};
    const n = d.n || 0;
    const sc = d.score != null ? Math.round(d.score * 100) : null;
    const scored = n >= 3 && sc != null && sc < 40;
    box.innerHTML = '<ul class="whylist">' + row(!!b.approved, t("whyApproved"), b.approved ? "" : t("whyApprovedNo")) + row(
      !scored,
      t("whyScoreOk"),
      n === 0 ? t("whyNoRatings") : scored ? fillT("whyScoreBad", { s: sc }) : fillT("whyScoreIs", { s: sc, n })
    ) + row(
      !d.burnt,
      t("whyNotBurnt"),
      d.burnt ? fillT("whyBurntNo", { s: d.worst_label || t("wholeLesson"), c: d.worst_explains }) : d.assists ? fillT("whyAssists", { n: d.assists }) : ""
    ) + '</ul><p class="hint">' + esc(t("whyFoot")) + "</p>";
  }
  async function loadUses() {
    const { data } = await sb.rpc("lk_uses");
    state.uses = data || [];
  }
  function usedLine(planId) {
    const u = usesOf(planId);
    if (!u.length) return "";
    const last = u[0];
    return '<p class="shline used">' + esc(fillT("usedLast", { g: last.group_name, d: fmtDate(last.used_on) })) + (u.length > 1 ? " " + esc(fillT("usedTimes", { n: u.length })) : "") + "</p>";
  }
  function usesOf(planId, group) {
    return state.uses.filter((u) => u.plan_id === planId && (!group || u.group_name === group));
  }
  function fmtDate(d) {
    return new Date(d).toLocaleDateString(LANG === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" });
  }
  async function logUse(planId) {
    const r = state.row;
    if (!planId || !r || !r.group) return;
    try {
      await sb.rpc("lk_log_run", {
        p_plan_id: planId,
        p_group: r.group,
        p_absence_ref: r.id || null,
        p_substitute: r.cover || null,
        p_time: r.start ? r.start + (r.end ? "\u2013" + r.end : "") : null
      });
      await loadUses();
    } catch {
    }
  }
  function planUrl(token) {
    const base = location.origin + location.pathname.replace(/[^/]*$/, "") + "plan.html?";
    return String(token).startsWith("r:") ? base + "r=" + String(token).slice(2) : base + "t=" + token;
  }
  function subLinkToken() {
    const g = state.row?.group;
    const u = g && g !== "\u2014" && state.planId ? usesOf(state.planId, g)[0] : null;
    return u && u.run_token ? "r:" + u.run_token : state.shareToken;
  }
  var EMBED = (() => {
    const q = new URLSearchParams(location.search);
    if (q.get("embed") !== "1") return null;
    const num = (k, d) => {
      const n = parseInt(q.get(k) || "", 10);
      return Number.isFinite(n) ? n : d;
    };
    return {
      row: {
        id: q.get("ref") || "",
        subject: q.get("subject") || "\u2014",
        year: q.get("year") || "",
        group: q.get("group") || "",
        raw: q.get("code") || q.get("subject") || "",
        mins: num("mins", 45),
        start: q.get("start") || "",
        end: q.get("end") || "",
        time: [q.get("start"), q.get("end")].filter(Boolean).join("\u2013"),
        room: q.get("room") || "\u2014",
        teacher: q.get("teacher") || "\u2014",
        cover: q.get("cover") || null,
        practical: q.get("practical") === "1",
        plannable: true
      },
      lang: q.get("lang") === "en" ? "en" : null
    };
  })();
  function toParent(type, payload) {
    if (!EMBED || window.parent === window) return;
    try {
      window.parent.postMessage({ source: "lektionskollen", type, ...payload }, "*");
    } catch {
    }
  }
  function openEmbed() {
    if (!EMBED) return;
    document.body.classList.add("embed");
    state.row = EMBED.row;
    state.plan = null;
    state.planId = null;
    state.view = "coordinator";
    $("overlay").hidden = false;
    loadBank().then(() => {
      if (!state.planId) showRequest();
    }).catch(() => showRequest());
    showRequest();
    toParent("lk:ready", { ref: EMBED.row.id });
  }
  function openAddin(id) {
    state.row = ROWS.find((x) => x.id === id) || null;
    state.plan = null;
    state.planId = null;
    state.view = "coordinator";
    if (state.row) {
      state.pool.sub = canonSubject(state.row.subject);
      state.pool.yr = canonYear(state.row.year);
      savePoolPick();
    }
    $("overlay").hidden = false;
    document.body.style.overflow = "hidden";
    showRequest();
  }
  function closeAddin() {
    if (EMBED) {
      toParent("lk:close", {});
      return;
    }
    $("overlay").hidden = true;
    document.body.style.overflow = "";
    document.body.classList.remove("panelmode");
    if (state.screen === "cover") loadCoverPlans().then(renderRows).catch(() => {
    });
  }
  function showRequest() {
    const r = state.row;
    if (!r) return;
    $("seam-state").textContent = "lk:init";
    const matches = state.bank.filter((b) => b.subject === r.subject && b.year_group === r.year && b.approved);
    $("addin-content").innerHTML = '<div class="addin-body"><div class="addin-head"><div style="flex:1;min-width:0"><h2 id="addin-title">' + esc(t("planFor")) + " " + esc(r.group) + '</h2><div class="plan-meta">' + esc(r.teacher) + " \xB7 " + esc(r.time) + " \xB7 " + esc(r.room) + (r.cover ? " \xB7 " + esc(r.cover) : " \xB7 " + esc(t("uncovered").toLowerCase())) + '</div></div><button class="x" data-close aria-label="St\xE4ng">\u2715</button></div><div class="derived"><div><dt>' + esc(t("subjectLbl")) + "</dt><dd>" + esc(subjectLabel(r.subject)) + '</dd><div class="from">' + esc(t("fromCode")) + ' "' + esc(r.raw) + '"</div></div><div><dt>' + esc(t("yearLbl")) + "</dt><dd>" + esc(yearLabel(r.year)) + '</dd><div class="from">' + esc(t("derivedFrom")) + ' "' + esc(r.group) + '"</div></div><div><dt>' + esc(t("lengthLbl")) + "</dt><dd>" + r.mins + " " + esc(t("min")) + '</dd><div class="from">' + esc(r.start) + "\u2013" + esc(r.end) + "</div></div></div>" + (r.practical ? '<div class="flag"><span>\u26A0</span><div><b>' + esc(t("practicalWarn")) + "</b> " + esc(t("practicalBody")) + "</div></div>" : "") + (matches.length ? '<div><div class="sect-h">' + esc(t("fromBank")) + " \u2014 " + matches.length + " " + esc(matches.length === 1 ? t("bankApproved") : t("bankApprovedPl")) + '</div><div class="bankrow">' + matches.map((b) => {
      const had = usesOf(b.id, r.group);
      return '<button class="bankcard' + (had.length ? " hadit" : "") + '" data-usebank="' + b.id + '"><div style="flex:1;min-width:0"><div class="t">' + esc(rowTitle(b)) + '</div><div class="m">' + b.minutes + " " + esc(t("min")) + " \xB7 " + b.rating_count + " " + esc(t("ratings")) + (b.shared ? " \xB7 " + esc(t("sharedTag")) : "") + "</div>" + (had.length ? '<div class="hadwarn">\u26A0 ' + esc(fillT("hadIt", { g: r.group, d: fmtDate(had[0].used_on) })) + "</div>" : "") + '</div><span class="stars">' + stars(b.rating) + '</span><span class="btn btn-soft btn-sm">' + esc(t("use")) + "</span></button>";
    }).join("") + "</div></div>" : '<div><div class="sect-h">' + esc(t("fromBank")) + '</div><p class="hint">' + esc(t("bankNone")) + " " + esc(subjectLabel(r.subject)) + " " + esc(yearLabel(r.year)) + " " + esc(t("bankNoneTail")) + (EMBED ? "" : ' <button class="btn btn-ghost btn-sm" data-poolgo>' + esc(t("poolBrowse")) + " \u2192</button>") + "</p></div>") + (matches.length ? '<details class="steerbox"><summary>' + esc(t("noFit")) + "</summary>" : "") + '<div><div class="sect-h">' + esc(t("steer")) + '</div><div class="steer"><label class="f full">' + esc(t("fTopic")) + '<input id="s-topic" placeholder="' + esc(t("fTopicPh")) + '"></label><label class="f full">' + esc(t("fNotes")) + '<textarea id="s-notes" rows="2" placeholder="' + esc(t("fNotesPh")) + '"></textarea></label><label class="f">' + esc(t("fType")) + '<select id="s-type">' + (r.practical ? ["typeTheory", "typeContinue", "typePractical"] : ["typeRevision", "typeDeep", "typeQuiet"]).map((k) => "<option>" + esc(t(k)) + "</option>").join("") + '</select></label><p class="hint full" style="margin:2px 0 0">' + esc(t("fTypeHint")) + '</p><div class="full"><div class="sect-h" style="margin-bottom:6px">' + esc(t("fRes")) + '</div><div class="chips">' + ["resWhiteboard", "resProjector", "resComputers", "resBooks", "resMini"].map((k, i) => '<button class="tog' + (i === 0 ? " on" : "") + '" data-res>' + esc(t(k)) + "</button>").join("") + "</div></div></div></div>" + (matches.length ? "</details>" : "") + '<div class="foot"><span class="hint">' + esc(t("privacyNote")) + '</span><span class="spacer"></span><button class="btn btn-ghost" data-close>' + esc(t("cancel")) + '</button><button class="btn ' + (matches.length ? "btn-ghost" : "btn-primary") + '" data-generate>' + esc(t("create")) + "</button></div></div>";
  }
  function gatherRequest() {
    const r = state.row;
    if (!r) throw new Error("no lesson selected");
    return {
      absence_ref: r.id,
      subject: r.subject,
      year_group: r.year,
      group_name: r.group,
      room: r.room,
      starts_at: r.start,
      ends_at: r.end,
      minutes: r.mins,
      topic: maybe$("s-topic")?.value || "",
      notes: maybe$("s-notes")?.value || "",
      lesson_type: maybe$("s-type")?.value || "",
      // Always both languages: lk-generate writes one and translates it, so the
      // plan carries sv and en and the reader toggles.
      language: "sv",
      resources: [...document.querySelectorAll("[data-res].on")].map((b) => b.textContent)
    };
  }
  async function generate() {
    const req = gatherRequest();
    $("seam-state").textContent = t("seamGenerating");
    $("addin-content").innerHTML = '<div class="gen"><div class="bar"><i id="pbar" style="width:12%"></i></div><div class="genstep" id="pstep">' + esc(t("genCalling")) + '</div><p class="hint" style="max-width:420px">' + esc(t("genNote")) + "</p></div>";
    let pct = 12;
    const tick = setInterval(() => {
      pct = Math.min(90, pct + 9);
      const b = $("pbar");
      if (b) b.style.width = pct + "%";
    }, 400);
    const other = req.language === "en" ? "sv" : "en";
    const main = await sb.functions.invoke("lk-generate", { body: { request: req } });
    let alt = { error: new Error("skipped") };
    if (!main.error && !main.data?.error) {
      $("pstep").textContent = t("genTranslating");
      alt = await sb.functions.invoke("lk-generate", {
        body: { request: { ...req, language: other }, translate: main.data.source === "model" ? main.data.plan : void 0 }
      });
    }
    clearInterval(tick);
    if (main.error || main.data?.error) {
      const code = main.data?.error || "";
      const saidMap = {
        no_model: t("errNoModel"),
        quota: fillT("errQuota", { n: main.data?.limit ?? "" })
      };
      const said = saidMap[code];
      const msg = said || main.data?.detail || main.error?.message || t("errUnknown");
      $("addin-content").innerHTML = '<div class="addin-body"><div class="addin-head"><h2>' + esc(t("failed")) + '</h2><button class="x" data-close aria-label="St\xE4ng">\u2715</button></div><div class="alert error">' + esc(msg) + '</div><div class="foot"><span class="spacer"></span><button class="btn btn-ghost" data-close>' + esc(t("cancel")) + '</button><button class="btn btn-primary" data-generate>' + esc(t("retry")) + "</button></div></div>";
      return;
    }
    const altPlan = !alt.error && !alt.data?.error ? alt.data.plan : null;
    const { data: pid, error: saveErr } = await sb.rpc("lk_save_plan", {
      p_request: req,
      p_plan: main.data.plan,
      p_model: main.data.model || null,
      p_plan_alt: altPlan,
      p_language_alt: altPlan ? other : null
    });
    if (saveErr) toast(t("saveFailed") + " " + saveErr.message);
    const bodies = { [req.language]: main.data.plan };
    if (altPlan) bodies[other] = altPlan;
    state.bodies = bodies;
    state.plan = pickBody();
    state.planId = pid || null;
    state.approved = false;
    applyApproval({});
    state.shareToken = null;
    state.model = main.data.model || null;
    showPlan();
    loadBank();
  }
  function pickBody() {
    const b = state.bodies || {};
    return b[LANG] || b.sv || b.en || Object.values(b)[0] || null;
  }
  function bodyIsFallback() {
    return !!(state.bodies && !state.bodies[LANG]);
  }
  function applyApproval(d) {
    state.approved = !!d.approved;
    state.apprKind = d.approved_kind || null;
    state.apprRank = Number(d.approval_rank) || 0;
    state.apprBy = d.approved_name || null;
    state.apprSubject = d.approved_subject || null;
    state.apprStale = !!d.approval_stale;
  }
  var APPROVER_KEY = "lk_approver";
  function apprNameValue() {
    if (state.apprName != null) return state.apprName;
    try {
      return localStorage.getItem(APPROVER_KEY) || "";
    } catch {
      return "";
    }
  }
  var APPR_RUNGS = [
    [1, "coordinator", "apprCoord", "btn-ghost"],
    [2, "teacher", "apprTeacher", "btn-ok"],
    [3, "qualified", "apprQualified", "btn-primary"]
  ];
  var APPR_ERR = { gate_closed: "errGate", already_approved: "errAlready", name_required: "errName", has_blockers: "errBlockers" };
  function apprButtons(rank) {
    return APPR_RUNGS.filter((r) => r[0] > rank).map((r) => '<button class="btn ' + r[3] + ' btn-sm" data-approve="' + r[1] + '">' + apprStars(r[0], "", true) + " " + esc(t(r[2])) + "</button>").join("");
  }
  function approveBar() {
    const rank = state.apprRank || 0;
    if (rank >= APPR_MAX) return "";
    const fresh = !state.approved;
    return '<div class="approvebar' + (fresh ? "" : " raise") + '"><div>' + (fresh ? "<b>" + esc(t("coordAsk")) + "</b> " + esc(t("apBody")) + '<br><span class="hint">' + esc(t("coordAskNote")) + "</span>" : "<b>" + esc(rank ? fillT("apRaise", { l: apprLevelName(rank) }) : t("apReapprove")) + "</b> " + esc(t("apRaiseBody"))) + '<br><span class="hint">' + esc(t("apprKindNote")) + '</span><label class="aprname"><span>' + esc(t("apprNameLabel")) + '</span><input id="apr-name" type="text" maxlength="80" autocomplete="name" placeholder="' + esc(t("apprNamePh")) + '" value="' + esc(apprNameValue()) + '"></label></div><div class="ladder">' + apprButtons(rank) + "</div></div>";
  }
  function apprSignedLine() {
    const rank = state.apprRank || 0;
    if (!rank) return "";
    return apprStars(rank) + " " + esc(apprLevelName(rank) + (rank >= 2 && state.apprSubject ? " \xB7 " + subjectLabel(state.apprSubject) : "")) + (state.apprBy ? " \u2014 " + esc(fillT("apprSignedBy", { n: state.apprBy })) : "") + (rank >= APPR_MAX ? " " + esc(t("apprLocked")) : "");
  }
  async function usePlan(id) {
    const { data, error } = await sb.rpc("lk_plan", { p_id: id });
    if (error || !data) {
      toast(t("errOpen"));
      return;
    }
    const bodies = { [data.language || "sv"]: data.body };
    if (data.body_alt && data.language_alt) bodies[data.language_alt] = data.body_alt;
    state.bodies = bodies;
    state.plan = pickBody();
    state.planId = data.id;
    applyApproval(data);
    state.shareToken = data.share_token;
    state.model = data.model || null;
    if (!state.row) state.row = { id: "", raw: "", subject: data.subject, year: data.year_group, group: "\u2014", mins: data.minutes, time: "", start: "", end: "", room: "\u2014", teacher: "\u2014", cover: null };
    $("overlay").hidden = false;
    document.body.style.overflow = "hidden";
    if (data.check_result && state.checks[data.id] === void 0) {
      state.checks[data.id] = data.check_result;
    }
    showPlan();
    checkPlan(data.id).then(() => {
      if (state.planId === data.id) showPlan();
    }).catch(() => {
    });
  }
  function showPlan() {
    const r = state.row, p = state.plan;
    if (!r || !p) return;
    $("seam-state").textContent = state.approved ? t("seamApproved") : t("seamWaiting");
    const fallbackNote = bodyIsFallback() ? '<div class="flag" style="background:var(--warn-bg);color:#7c4a02"><span>!</span><div>' + esc(t("onlyInOther")) + "</div></div>" : "";
    const simNote = state.model === "canned" ? '<div class="flag sim"><span>\u26A0</span><div><b>' + esc(t("simTitle")) + "</b> " + esc(t("simBody")) + "</div></div>" : "";
    const fbRow = state.view === "coordinator" ? fbRowForOpenPlan() : null;
    const fbBox = fbRow ? '<div class="fx fbbox"><h4>' + esc(t("fbThisPlan")) + "</h4>" + fbBody(fbRow) + "</div>" : "";
    const head = '<div class="addin-body"><div class="addin-head"><div style="flex:1;min-width:0"><h2 id="addin-title" class="plan-title">' + esc(p.title) + '</h2><div class="plan-meta">' + esc(subjectLabel(r.subject)) + " \xB7 " + esc(yearLabel(r.year)) + " \xB7 " + esc(r.group) + (r.start ? " \xB7 " + esc(r.start) + "\u2013" + esc(r.end) : "") + '</div></div><button class="x" data-close aria-label="St\xE4ng">\u2715</button></div><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div class="viewtog"><button class="' + (state.view === "coordinator" ? "on" : "") + '" data-view="coordinator">' + esc(t("viewCoord")) + '</button><button class="' + (state.view === "vikarie" ? "on" : "") + '" data-view="vikarie">' + esc(t("viewSub")) + "</button></div>" + // The sidebar toggle sits behind this overlay, so the plan carries its own.
    (state.bodies && Object.keys(state.bodies).length > 1 ? '<div class="viewtog">' + ["sv", "en"].filter((c) => state.bodies?.[c]).map((c) => '<button class="' + (c === LANG ? "on" : "") + '" data-planlang="' + c + '">' + (c === "sv" ? "SV" : "EN") + "</button>").join("") + "</div>" : "") + '<span class="hint">' + (state.view === "coordinator" ? esc(t("coordHint")) : esc(t("subHint")) + " " + esc(p.readTime || "")) + "</span></div>";
    const check = state.planId ? state.checks[state.planId] : null;
    const checkNote = state.view === "coordinator" ? checkBanner(check) : "";
    const approveNote = state.view === "coordinator" ? approveBar() : "";
    const staleNote = state.apprStale ? '<div class="flag" style="background:var(--warn-bg)"><span>!</span><div>' + esc(t("apprStaleWarn")) + "</div></div>" : "";
    $("addin-content").innerHTML = head + checkNote + staleNote + approveNote + simNote + fallbackNote + fbBox + (state.view === "coordinator" ? coordView(p, r) : vikarieView(p, r)) + "</div>";
  }
  function minDiff(a, b) {
    const [h1, m1] = a.split(":").map(Number), [h2, m2] = b.split(":").map(Number);
    return h2 * 60 + m2 - (h1 * 60 + m1);
  }
  var CHK = '<svg class="cl-ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path class="cl-link" d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path class="cl-link" d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/><path class="cl-tick" d="M5 12.5l4.5 4.5L19 7"/></svg>';
  function coordView(p, r) {
    const phases = p.phases || [];
    const sum = phases.reduce((a, ph) => {
      const m = String(ph.t || "").split("\u2013");
      return a + (m.length === 2 ? minDiff(m[0], m[1]) : 0);
    }, 0);
    const lt = subLinkToken();
    const link = lt ? planUrl(lt) : null;
    return '<div class="plan"><div class="ps" style="border:0;padding-top:4px"><h4>' + esc(t("whatItIs")) + "</h4><p>" + esc(p.summary) + '</p></div><div class="twocol"><div class="callout"><strong>' + esc(t("goal")) + "</strong>" + esc(p.goal) + '</div><div class="callout"><strong>' + esc(t("curriculum")) + '</strong><span style="font-size:12.5px">' + esc(p.curriculum) + '</span></div></div><div class="ps"><h4>' + esc(t("toCheck")) + "</h4><ul><li>" + esc(t("phasesSum")) + " <b>" + sum + " " + esc(t("min")) + "</b> \u2014 " + esc(t("lessonIs")) + " " + r.mins + " " + esc(t("min")) + ". " + (sum === r.mins ? '<span class="chip chip-ok">' + esc(t("matches")) + "</span>" : '<span class="chip chip-warn">' + esc(t("checkIt")) + "</span>") + "</li><li>" + esc(t("allWritten")) + ' <span class="chip chip-ok">' + esc(t("ok")) + "</span></li><li>" + esc(t("requires")) + " " + esc(p.equipment?.need || "\u2014") + "</li></ul></div>" + (state.approved ? '<div class="flag" style="background:var(--ok-bg);color:#14532d"><span>\u2713</span><div><b>' + esc(t("approvedTitle")) + "</b> " + apprSignedLine() + " " + (link ? esc(t("subLink")) + ' <button type="button" class="linkchip mono" data-copylink="' + esc(lt) + '" title="' + esc(t("copyLink")) + '">' + CHK + '<span class="cl-label">' + esc(link) + "</span></button>" : "") + "</div></div>" : "") + '<div class="foot">' + (state.approved ? '<span class="spacer"></span><button class="btn btn-ghost" data-view="vikarie">' + esc(t("seeSubView")) + "</button>" + (link ? '<button class="btn btn-ghost" data-copymail="' + esc(lt) + '">' + CHK + '<span class="cl-label">' + esc(t("copyMail")) + "</span></button>" : "") + (link ? '<button class="btn btn-primary" data-copylink="' + esc(lt) + '">' + CHK + '<span class="cl-label">' + esc(t("copyLink")) + "</span></button>" : "") : '<span class="hint">' + esc(t("nothingBefore")) + '</span><span class="spacer"></span><button class="btn btn-ghost" data-frompool>' + esc(t("fromPool")) + '</button><button class="btn btn-ghost" data-regen>' + esc(t("regen")) + "</button>" + apprButtons(0)) + "</div></div>";
  }
  function assistRow(ref, label) {
    const a = (k, v, txt) => '<button data-assist="' + k + '" data-ref="' + esc(ref) + '"' + (v ? ' data-variant="' + v + '"' : "") + ' data-alabel="' + esc(label) + '">' + esc(txt) + "</button>";
    return '<div class="assist noprint">' + a("explain", "", t("aExplain")) + a("exercise", "", t("aExercise")) + a("level", "easier", t("aEasier")) + a("level", "harder", t("aHarder")) + "</div>";
  }
  function assistSheetHtml(extra, source) {
    const srcTxt = source === "model" ? t("srcModel") : source === "cache" ? t("srcCache") : source === "fallback" ? t("srcFallback") : t("srcLibrary");
    let h = "<h3>" + esc(extra.title) + '</h3><div class="src">' + esc(srcTxt) + (extra.minutes ? " \xB7 " + extra.minutes + " min" : "") + " \xB7 " + esc(t("assistPreview")) + "</div>";
    h += "<ol>" + (extra.lines || []).map((x) => "<li>" + esc(x) + "</li>").join("") + "</ol>";
    if (extra.board) {
      h += '<h4 style="font-size:13px;margin-bottom:5px">' + esc(t("boardNow")) + '</h4><div class="board">' + esc(extra.board) + "</div>";
    }
    if ((extra.tasks || []).length) {
      h += '<h4 style="font-size:13px;margin:14px 0 5px">' + esc(t("tasksNow")) + '</h4><ol style="font-size:13.5px">' + extra.tasks.map((x) => "<li>" + esc(x.q) + ' <span class="ans">' + esc(x.a) + "</span></li>").join("") + "</ol>";
    }
    return h;
  }
  async function previewAssist(opts) {
    const sheet = $("assist-sheet"), bodyEl = $("assist-sheet-body");
    bodyEl.innerHTML = '<h3><span class="spin"></span> ' + esc(t("working")) + "</h3>";
    sheet.hidden = false;
    const r = state.row, p = state.plan;
    const { data, error } = await sb.functions.invoke("lk-assist", {
      body: {
        kind: opts.kind,
        section_ref: opts.ref,
        section_label: opts.label,
        section_text: opts.text || "",
        variant: opts.variant || "",
        language: LANG,
        // So the extras cap applies to the right plan rather than pooling every
        // plan's extras into one bucket.
        plan_id: state.planId || void 0,
        subject: r?.subject,
        year_group: r?.year,
        topic: p?.title,
        minutes_left: opts.minutes || void 0
      }
    });
    if (error || !data?.extra) {
      bodyEl.innerHTML = '<h3>\u2014</h3><p class="muted">' + esc(error?.message || "error") + "</p>";
      return;
    }
    const shown = data.language === LANG ? data.extra : data.language_alt === LANG && data.extra_alt ? data.extra_alt : data.extra;
    bodyEl.innerHTML = assistSheetHtml(shown, data.source);
  }
  function vikarieView(p, _r) {
    const MAP = {
      goal: "goalShort",
      need: "youNeed",
      expect: "expected",
      tasks: "tasksTitle",
      stuck: "stuckL",
      ahead: "aheadL",
      wrong: "goesWrong"
    };
    const HEAT = fbHeatMap();
    const lbl = (k) => t(MAP[k] || k);
    let h = '<div class="plan"><div class="planview">' + window.LKPlan.render(p, {
      lbl,
      assistRow: (ref, name) => assistRow(ref, name),
      flag: (ref) => fbFlag(HEAT, ref),
      // The coordinator is previewing, not teaching: no projector, and the
      // depth switch belongs to the person in front of the class.
      projector: false
    }) + "</div>";
    h += window.LKPlan.after(p, lbl) + '<section class="reg reg-plain"><div class="reg-h"><span class="n">&#9742;</span>' + esc(t("whoToCall")) + '</div><p style="font-size:13px"><b>' + esc(t("coordinator")) + "</b> \xB7 " + esc(state.me?.school || "") + '<br><span style="color:var(--ink-soft)">' + esc(t("phoneNote")) + "</span></p></section>";
    h += '<section class="reg reg-plain"><div class="reg-h"><span class="n">+</span>' + esc(t("assistTitle")) + '</div><p class="hint" style="margin:0 0 9px">' + esc(t("assistNote")) + '</p><div class="assist noprint"><span class="hint" style="align-self:center">' + esc(t("minLeft")) + "</span>" + [5, 10, 15, 20].map((m) => '<button data-fill="' + m + '">' + m + "</button>").join("") + "</div></section>";
    h += '<div class="foot"><span class="hint">' + esc(t("subSeesThis")) + '</span><span class="spacer"></span><button class="btn btn-ghost" data-view="coordinator">' + esc(t("back")) + "</button></div></div>";
    return h;
  }
  document.addEventListener("toggle", (e) => {
    const tg = e.target;
    const d = tg.closest ? tg.closest("[data-why]") : null;
    if (!d || !d.open) return;
    const body = d.querySelector(".whybody");
    if (body) shareWhy(d.getAttribute("data-why") || "", body);
  }, true);
  var copyTimers = /* @__PURE__ */ new WeakMap();
  document.addEventListener("click", async (e) => {
    const tg = e.target;
    const a = tg.closest("[data-assist]");
    if (a) {
      return previewAssist({
        kind: a.getAttribute("data-assist"),
        ref: a.getAttribute("data-ref"),
        label: a.getAttribute("data-alabel"),
        variant: a.getAttribute("data-variant") || "",
        text: a.closest(".phase, .ps")?.innerText?.slice(0, 1200) || ""
      });
    }
    const fill = tg.closest("[data-fill]");
    if (fill) {
      return previewAssist({
        kind: "filler",
        ref: "lesson",
        label: t("aFill"),
        minutes: Number(fill.getAttribute("data-fill"))
      });
    }
    if (tg.closest("[data-assistclose]") || tg.id === "assist-sheet") {
      $("assist-sheet").hidden = true;
      return;
    }
    const blk = tg.closest("[data-blk]");
    if (blk) {
      const r = blk.getBoundingClientRect();
      return openPop(blk.getAttribute("data-blk"), r.right + 6, r.top);
    }
    const tab = tg.closest("[data-tab]");
    if (tab) return showPlansTab(tab.getAttribute("data-tab"));
    const psub = tg.closest("[data-poolsub]");
    if (psub) return openShelf(psub.getAttribute("data-poolsub"), "");
    const pyr = tg.closest("[data-poolyr]");
    if (pyr) return openShelf(null, pyr.getAttribute("data-poolyr"));
    const pcell = tg.closest("[data-poolcell]");
    if (pcell) {
      const [cs, cy] = pcell.getAttribute("data-poolcell").split("|");
      return openShelf(cs, cy);
    }
    const pview = tg.closest("[data-poolview]");
    if (pview) {
      state.pool.view = pview.getAttribute("data-poolview") === "cover" ? "cover" : "shelf";
      savePoolPick();
      return renderBank();
    }
    if (tg.closest("[data-poolgo]") && state.row) {
      state.pool = { view: "shelf", sub: canonSubject(state.row.subject), yr: canonYear(state.row.year) };
      savePoolPick();
      closeAddin();
      state.tab = "bank";
      return showScreen("plans");
    }
    const loud = tg.closest("[data-loud]");
    if (loud) return setLoud(loud.getAttribute("data-loud"));
    const po = tg.closest("[data-planopen]");
    if (po) return openPlanPanel(po.getAttribute("data-planopen"));
    const pl = tg.closest("[data-planlink]");
    if (pl) return openLinkBox(pl.getAttribute("data-planlink"));
    const pn = tg.closest("[data-plannot]");
    if (pn) {
      const ref = pn.getAttribute("data-plannot");
      closePop();
      await sb.rpc("lk_set_cover_plan", { p_absence_ref: ref, p_kind: "not_needed" });
      await loadCoverPlans();
      renderRows();
      toast(t("cvPlNotSaved"));
      return;
    }
    const pxt = tg.closest("[data-planextend]");
    if (pxt) {
      closePop();
      const { data: until } = await sb.rpc("lk_extend_cover_plan", { p_absence_ref: pxt.getAttribute("data-planextend"), p_days: 14 });
      await loadCoverPlans();
      renderRows();
      if (until) toast(t("cvPlExtended") + " " + new Date(until).toLocaleDateString(LANG === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" }));
      return;
    }
    const pc = tg.closest("[data-planclear]");
    if (pc) {
      const ref = pc.getAttribute("data-planclear");
      closePop();
      await sb.rpc("lk_clear_cover_plan", { p_absence_ref: ref });
      await loadCoverPlans();
      renderRows();
      return;
    }
    if (tg.closest("[data-lbcancel]")) {
      $("linkbox").hidden = true;
      return;
    }
    const lbs = tg.closest("[data-lbsave]");
    if (lbs) return saveLink(lbs.getAttribute("data-lbsave"));
    if (tg.closest("[data-planfirst]")) {
      const first = ROWS.find((r) => r.plannable && r.cover && !planFor(r.id));
      if (first) return openPlanPanel(first.id);
    }
    if (POP && !tg.closest("#cv-pop")) closePop();
    const el = tg.closest("[data-open],[data-close],[data-generate],[data-approve],[data-regen],[data-frompool],[data-view],[data-planlang],[data-usebank],[data-res],[data-viewplan],[data-copylink],[data-copymail],[data-review],[data-cap],[data-nav],[data-lang],#refreshbank");
    if (!el) return;
    const t2 = el;
    if (t2.hasAttribute("data-lang")) return setLang(t2.getAttribute("data-lang") === "en" ? "en" : "sv");
    if (t2.hasAttribute("data-nav")) {
      const id = t2.getAttribute("data-nav");
      const item = NAV.find((n) => n.id === id);
      if (!item || !item.real) {
        toast(t("notHere"));
        return;
      }
      return showScreen(id);
    }
    if (t2.id === "refreshbank") return loadBank();
    if (t2.hasAttribute("data-cap")) {
      const v = Number(t2.getAttribute("data-cap"));
      const { data, error } = await sb.rpc("lk_set_assist_cap", { p_cap: v });
      if (error || !data) {
        toast(error?.message || "error");
        return;
      }
      state.cap = v;
      renderSettings();
      toast(t("capSaved"));
      return;
    }
    if (t2.hasAttribute("data-review")) {
      const [id, keep] = t2.getAttribute("data-review").split(":");
      t2.disabled = true;
      const { error } = await sb.rpc("lk_review_extra", { p_extra_id: Number(id), p_kept: keep === "1" });
      if (error) {
        t2.disabled = false;
        toast(error.message);
        return;
      }
      toast(t(keep === "1" ? "keptToast" : "hiddenToast"));
      return loadFeedback();
    }
    if (t2.hasAttribute("data-res")) return t2.classList.toggle("on");
    if (t2.hasAttribute("data-open")) return openAddin(t2.getAttribute("data-open"));
    if (t2.hasAttribute("data-close")) return closeAddin();
    if (t2.hasAttribute("data-generate")) return generate();
    if (t2.hasAttribute("data-regen")) return showRequest();
    if (t2.hasAttribute("data-frompool")) {
      showRequest();
      const br = document.querySelector(".bankrow");
      if (br) br.scrollIntoView({ block: "center" });
      return;
    }
    if (t2.hasAttribute("data-view")) {
      state.view = t2.getAttribute("data-view");
      return showPlan();
    }
    if (t2.hasAttribute("data-planlang")) return setLang(t2.getAttribute("data-planlang") === "en" ? "en" : "sv");
    if (t2.hasAttribute("data-viewplan")) return usePlan(t2.getAttribute("data-viewplan"));
    if (t2.hasAttribute("data-usebank")) {
      const pid = t2.getAttribute("data-usebank");
      return usePlan(pid).then(() => logUse(pid)).then(() => {
        if (state.planId === pid) showPlan();
      });
    }
    if (t2.hasAttribute("data-copylink") || t2.hasAttribute("data-copymail")) {
      const tok = t2.getAttribute("data-copylink") || t2.getAttribute("data-copymail");
      const url = planUrl(tok);
      let text = url;
      if (t2.hasAttribute("data-copymail")) {
        const r = state.row || {};
        const what = [r.subject, r.year, r.group && "(" + r.group + ")"].filter(Boolean).join(" ") + (r.start ? ", " + r.start + "\u2013" + r.end : "");
        text = t("mailHi") + "\n\n" + t("mailIntro") + " " + what + ":\n" + url + "\n\n" + t("mailNote") + "\n\n" + t("mailBye");
      }
      const label = t2.querySelector(".cl-label") || t2;
      const orig = label.dataset.orig || label.textContent || "";
      label.dataset.orig = orig;
      let ok = true;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.cssText = "position:fixed;opacity:0";
          document.body.appendChild(ta);
          ta.select();
          ok = document.execCommand("copy");
          ta.remove();
        } catch {
          ok = false;
        }
      }
      if (!ok) {
        toast(text, 12e3);
        return;
      }
      clearTimeout(copyTimers.get(t2));
      t2.classList.remove("copied");
      void t2.offsetWidth;
      t2.classList.add("copied");
      label.textContent = t("copiedShort");
      copyTimers.set(t2, setTimeout(() => {
        t2.classList.remove("copied");
        label.textContent = orig;
      }, 1800));
      return;
    }
    if (t2.hasAttribute("data-approve")) {
      const kind = t2.getAttribute("data-approve") || "coordinator";
      const name = apprNameValue().trim();
      if (name.length < 2) {
        toast(t("errName"));
        const f = $("apr-name");
        if (f) {
          f.scrollIntoView({ block: "center" });
          f.focus();
        }
        return;
      }
      const first = !state.approved;
      const { data: ap, error } = await sb.rpc(
        "lk_approve_as",
        { p_id: state.planId, p_kind: kind, p_subject: null, p_name: name }
      );
      if (error) {
        toast(t("errApprove") + " " + error.message);
        return;
      }
      const { data } = await sb.rpc("lk_plan", { p_id: state.planId });
      if (data) applyApproval(data);
      if (ap && ap.ok === false) {
        toast(t("errApprove") + " " + t(APPR_ERR[ap.error] || "errApprove"));
        showPlan();
        return;
      }
      try {
        localStorage.setItem(APPROVER_KEY, name);
      } catch {
      }
      state.shareToken = data?.share_token || null;
      if (first) {
        await sb.rpc("lk_rate_v2", { p_id: state.planId, p_reuse: true, p_reasons: [] });
        await logUse(state.planId);
        if (state.screen === "cover") await loadCoverPlans().then(renderRows).catch(() => {
        });
        toParent("lk:plan", {
          planId: state.planId,
          ref: state.row?.id || null,
          shareToken: state.shareToken,
          url: subLinkToken() ? planUrl(subLinkToken()) : null,
          title: state.plan?.title || null
        });
      }
      showPlan();
      loadBank();
      toast(t("okApproved"));
      return;
    }
  });
  document.addEventListener("input", (e) => {
    const tg = e.target;
    if (tg && tg.id === "apr-name") state.apprName = tg.value;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const sheet = $("assist-sheet");
    if (sheet && !sheet.hidden) {
      sheet.hidden = true;
      return;
    }
    if (!$("overlay").hidden) closeAddin();
  });
  $("overlay").addEventListener("mousedown", (e) => {
    if (e.target.id === "overlay") closeAddin();
  });
  ["f-scope", "f-approval"].forEach((id) => $(id).addEventListener("change", loadBank));
  var KIND_KEY = { explain: "aExplain", exercise: "aExercise", filler: "aFill" };
  function kindLabel(kind, variant) {
    if (kind === "level") return t(variant === "easier" ? "aEasier" : "aHarder");
    return t(KIND_KEY[kind] || "aExplain");
  }
  function extraText(x) {
    let body = x.body, note = "";
    if (x.language !== LANG && x.language_alt === LANG && x.body_alt) body = x.body_alt;
    else if (x.language !== LANG) note = '<span class="chip chip-neutral">' + esc(t("onlyOther")) + "</span>";
    const bd = body || {};
    let h = '<div class="fx-title">' + esc(bd.title || "") + " " + note + "</div>";
    if ((bd.lines || []).length) h += "<ol>" + bd.lines.map((l) => "<li>" + esc(l) + "</li>").join("") + "</ol>";
    if (bd.board) h += '<div class="board">' + esc(bd.board) + "</div>";
    if ((bd.tasks || []).length) h += "<ol>" + bd.tasks.map((q) => "<li>" + esc(q.q) + ' <span class="ans">' + esc(q.a) + "</span></li>").join("") + "</ol>";
    return h;
  }
  async function loadSettings() {
    const { data } = await sb.rpc("lk_get_settings");
    if (data && data.assist_cap !== void 0) state.cap = data.assist_cap;
    renderSettings();
  }
  function renderSettings() {
    const box = maybe$("fbsettings");
    if (!box) return;
    box.innerHTML = "<h4>" + esc(t("capTitle")) + '</h4><p class="hint">' + esc(t("capNote")) + '</p><div class="covrow">' + [[5, "5"], [20, "20"], [-1, t("capUnlimited")]].map(([v, lbl]) => '<button data-cap="' + v + '"' + (state.cap === v ? ' class="on"' : "") + ">" + esc(lbl) + "</button>").join("") + "</div>";
  }
  async function loadFeedback() {
    loadSettings();
    const [ex, ov, rn] = await Promise.all([sb.rpc("lk_extras", { p_id: null }), sb.rpc("lk_feedback_overview"), sb.rpc("lk_feedback_runs")]);
    if (ex.error || ov.error) {
      $("fbqueue").innerHTML = '<p class="note">' + esc((ex.error || ov.error).message) + "</p>";
      return;
    }
    state.queue = (ex.data || []).filter((x) => !x.reviewed && x.created_by_kind === "vikarie");
    const runs = rn.data || {};
    state.fb = (ov.data || []).map((x) => ({ ...x, runs: runs[x.id] || [] }));
    state.pending = state.queue.length;
    renderFeedback();
    renderNav();
    setTitles();
  }
  function fbRowForOpenPlan() {
    return (state.fb || []).find((x) => x.id === state.planId) || null;
  }
  function fbHeatMap() {
    const r = fbRowForOpenPlan();
    const m = {};
    (r && r.heat || []).forEach((x) => {
      if (x.section_ref) m[x.section_ref] = (m[x.section_ref] || 0) + x.n;
    });
    return m;
  }
  function fbSecMap() {
    const r = fbRowForOpenPlan();
    const m = {};
    (r && r.sections || []).forEach((x) => {
      m[x.section_ref] = x;
    });
    return m;
  }
  function fbFlag(map, ref) {
    const sec = fbSecMap()[ref];
    return (map[ref] ? '<span class="chip chip-warn fbchip">' + esc(t("neededHelp")) + " " + map[ref] + "\xD7</span>" : "") + (sec && sec.bad ? '<span class="chip chip-warn fbchip">' + esc(t("fbBad")) + " " + sec.bad + "\xD7</span>" : "") + (sec && sec.ok ? '<span class="chip chip-neutral fbchip">' + esc(t("fbOk")) + " " + sec.ok + "\xD7</span>" : "") + (sec && sec.skipped ? '<span class="chip chip-neutral fbchip">' + esc(t("fbSkipped")) + " " + sec.skipped + "\xD7</span>" : "");
  }
  function fbBody(p) {
    const fbk = p.feedback || { notes: [], comments: [] };
    const fill = fillT;
    const lines = [];
    if (p.ratings) lines.push(fill("fbSumYes", { y: p.yes, n: p.ratings }));
    const top = (p.heat || [])[0];
    if (top) lines.push(fill("fbSumHelp", { s: top.section_label || t("wholeLesson"), c: top.n === 1 ? t("fbTime1") : fill("fbTimesN", { c: top.n }) }));
    let h = lines.length ? '<p class="fbsum">' + lines.map(esc).join(" ") + "</p>" : '<p class="muted">' + esc(t("fbNoSignal")) + "</p>";
    if ((p.heat || []).length) {
      const max = Math.max(1, ...p.heat.map((x) => x.n));
      h += '<div class="sect-h">' + esc(t("heatTitle")) + "</div>" + p.heat.map((x) => '<div class="heat"><span class="hl"><b>' + esc(x.section_label || t("wholeLesson")) + '</b><br><span class="muted">' + esc(kindLabel(x.kind, "")) + '</span></span><span class="hb"><i style="width:' + Math.round(x.n / max * 100) + '%"></i></span><b>' + x.n + "\xD7</b></div>").join("");
      if (top && top.n >= 2) h += '<p class="fbwarn">' + esc(t("fbRewrite")) + "</p>";
    }
    if ((p.sections || []).length) {
      h += '<div class="sect-h">' + esc(t("fbSecTitle")) + "</div>" + p.sections.map((x) => {
        const n = x.good + x.ok + x.bad + x.skipped || 1;
        const seg = (key, c) => x[key] ? '<i class="' + c + '" style="width:' + Math.round(x[key] / n * 100) + '%"></i>' : "";
        return '<div class="heat"><span class="hl"><b>' + esc(x.section_label || x.section_ref) + '</b></span><span class="hb secbar">' + seg("good", "sb-w") + seg("ok", "sb-c") + seg("bad", "sb-b") + seg("skipped", "sb-s") + '</span><span class="secn"><b class="sb-wt">' + x.good + '</b> / <b class="sb-ct">' + x.ok + '</b> / <b class="sb-bt">' + x.bad + "</b></span></div>" + (x.notes || []).map((nt) => "<blockquote>" + esc(nt) + "</blockquote>").join("");
      }).join("") + '<p class="muted" style="font-size:12px">' + esc(t("fbSecKey")) + "</p>";
      if (p.sections.some((x) => x.bad >= 2)) h += '<p class="fbwarn">' + esc(t("fbRewrite")) + "</p>";
    }
    if ((p.runs || []).length) {
      h += '<div class="sect-h">' + esc(t("fbRunsTitle")) + "</div>" + p.runs.map((x) => '<div class="runrow"><span class="rl"><b>' + esc(x.group) + "</b> \xB7 " + esc(x.time ? x.time + " \xB7 " : "") + esc(fmtDate(x.date)) + (x.substitute ? " \xB7 " + esc(x.substitute) : "") + '</span><span class="rr">' + (x.answered ? (x.stars ? "<b>\u2605 " + esc(String(x.stars).replace(".", LANG === "sv" ? "," : ".")) + "</b> " : "") + '<b class="sb-wt">' + x.good + '</b> / <b class="sb-ct">' + x.ok + '</b> / <b class="sb-bt">' + x.bad + "</b>" : '<span class="muted">' + esc(t("fbRunNone")) + "</span>") + (x.teacher ? ' <span class="chip chip-neutral">' + esc(t("fbTeach_" + x.teacher)) + "</span>" : "") + "</span></div>").join("");
    }
    const said = [];
    fbk.comments.forEach((c) => {
      const parts = [];
      if (c.coverage) parts.push("<b>" + esc(t({ all: "fbCovAll", part: "fbCovPart", none: "fbCovNone" }[c.coverage])) + ".</b>");
      if (c.left_off) parts.push(esc(t("fbNote")) + ": " + esc(c.left_off));
      if (c.comment) parts.push(esc(c.comment));
      if (c.reasons && c.reasons.length) parts.push('<span class="muted">(' + esc(c.reasons.join(", ")) + ")</span>");
      if (parts.length) said.push("<blockquote>" + parts.join(" ") + "</blockquote>");
    });
    fbk.notes.forEach((n) => said.push("<blockquote>" + esc(t("fbOn")) + " <b>" + esc(n.section_label || t("wholeLesson")) + "</b>: " + esc(n.note) + "</blockquote>"));
    if (said.length) h += '<div class="sect-h">' + esc(t("fbSaid")) + "</div>" + said.join("");
    return h;
  }
  function renderFeedback() {
    const q = state.queue;
    $("fbqueue").innerHTML = q.length ? q.map((x) => '<div class="bcard fx"><div class="tags"><span class="chip chip-neutral">' + esc(subjectLabel(x.subject)) + '</span><span class="chip chip-neutral">' + esc(yearLabel(x.year_group)) + '</span><span class="chip chip-blue">' + esc(kindLabel(x.kind, x.variant)) + "</span>" + (x.section_label ? '<span class="chip chip-neutral">' + esc(x.section_label) + "</span>" : "") + (x.model === "canned" ? '<span class="chip chip-warn">' + esc(t("simTag")) + "</span>" : "") + '</div><div class="plan-meta">' + esc(x.title || "") + " \xB7 " + new Date(x.created_at).toLocaleString(LANG === "sv" ? "sv-SE" : "en-GB", { dateStyle: "short", timeStyle: "short" }) + "</div>" + extraText(x) + '<div style="display:flex;gap:6px"><button class="btn btn-ok btn-sm" data-review="' + x.id + ':1">' + esc(t("keep")) + '</button><button class="btn btn-ghost btn-sm" data-review="' + x.id + ':0">' + esc(t("hide")) + "</button></div></div>").join("") : '<p class="note">' + esc(t("queueEmpty")) + "</p>";
    $("fbplans").innerHTML = state.fb.length ? state.fb.map((p) => '<div class="bcard fx clickable" data-viewplan="' + p.id + '" title="' + esc(t("fbOpenHint")) + '"><h4>' + esc(p.title || p.subject) + '</h4><div class="tags"><span class="chip chip-neutral">' + esc(subjectLabel(p.subject)) + '</span><span class="chip chip-neutral">' + esc(yearLabel(p.year_group)) + "</span></div>" + fbBody(p) + '<div><span class="btn btn-soft btn-sm">' + esc(t("openPlan")) + " \u2192</span></div></div>").join("") : '<p class="note">' + esc(t("fbEmpty")) + "</p>";
  }
  function showPlansTab(which) {
    state.tab = which;
    $("tab-bank").hidden = which !== "bank";
    $("tab-feedback").hidden = which !== "feedback";
    $("tab-term").hidden = which !== "term";
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b.getAttribute("data-tab") === which));
    $("tabbadge").textContent = state.pending ? String(state.pending) : "";
    $("tabbadge").hidden = !state.pending;
    if (which === "bank") {
      loadUses().then(renderBank).catch(() => {
      });
      loadBank();
    }
    if (which === "feedback") loadFeedback();
    if (which === "term") loadTerm();
    setTitles();
  }
  function termWhere() {
    return { subject: $("tp-subject").value || "", year: $("tp-year").value || "" };
  }
  async function loadTerm() {
    const cov = await Promise.resolve(sb.rpc("lk_term_coverage")).then((r) => r.data || []).catch(() => []);
    state.termCoverage = cov;
    const subs = [.../* @__PURE__ */ new Set([
      ...CATALOG_SUBJECTS,
      ...state.bank.map((b) => canonSubject(b.subject)),
      ...cov.map((c) => canonSubject(c.subject))
    ])].filter(Boolean).sort((a, b) => subjectLabel(a).localeCompare(subjectLabel(b), LANG));
    const yrs = [.../* @__PURE__ */ new Set([
      ...CATALOG_YEARS,
      ...state.bank.map((b) => canonYear(b.year_group)),
      ...cov.map((c) => canonYear(c.year_group))
    ])].filter(Boolean).sort((a, b) => yearNum(a) - yearNum(b));
    const keep = (sel, list, fmt) => {
      const cur = sel.value;
      sel.innerHTML = list.map((x) => '<option value="' + esc(x) + '"' + (x === cur ? " selected" : "") + ">" + esc(fmt(x)) + "</option>").join("");
    };
    keep($("tp-subject"), subs, subjectLabel);
    keep($("tp-year"), yrs, yearLabel);
    $("tp-raw").placeholder = t("tpPastePh");
    renderTermStored();
  }
  var GRID_WEEKS = (() => {
    const w = [];
    for (let i = 33; i <= 52; i++) w.push(i);
    for (let i = 1; i <= 26; i++) w.push(i);
    return w;
  })();
  async function renderTermStored() {
    const { subject, year } = termWhere();
    const box = $("tp-stored");
    if (!subject || !year) {
      box.innerHTML = "";
      return;
    }
    const { data, error } = await sb.rpc("lk_term_plan", { p_subject: subject, p_year: year });
    if (error) {
      box.innerHTML = '<p class="note">' + esc(error.message) + "</p>";
      return;
    }
    const have = new Map((data || []).map((r) => [Number(r.week), r]));
    const weeks = GRID_WEEKS.slice();
    have.forEach((_, w) => {
      if (!weeks.includes(w)) weeks.push(w);
    });
    weeks.sort((x, y) => schoolYearPos(x) - schoolYearPos(y));
    const thisWeek = isoWeek(/* @__PURE__ */ new Date());
    box.innerHTML = '<div class="bcard fx" style="max-width:900px"><h4>' + esc(fillT("tpStoredH", { s: subjectLabel(subject), y: yearLabel(year) })) + '</h4><p class="hint">' + esc(fillT("tpStoredN", { n: have.size })) + " " + esc(t("tpGridHint")) + '</p><table class="tptable tpgrid"><thead><tr><th>' + esc(t("tpWeek")) + "</th><th>" + esc(t("tpTopic")) + "</th><th>" + esc(t("tpNote")) + "</th></tr></thead><tbody>" + weeks.map((w) => {
      const r = have.get(w) || {};
      const topic = r.topic || "", note = r.note || "";
      return '<tr data-gridrow="' + w + '" data-orig="' + esc(topic + "" + note) + '"' + (w === thisWeek ? ' class="now"' : "") + '><td class="wk"><b>' + w + '</b></td><td><input value="' + esc(topic) + '" data-gf="topic"></td><td><input value="' + esc(note) + '" data-gf="note"></td></tr>';
    }).join("") + '</tbody></table><div class="strow" style="margin-top:12px"><button class="btn btn-ok btn-sm" id="tp-gridsave">' + esc(t("tpGridSave")) + "</button></div></div>";
  }
  function isoWeek(d) {
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = x.getUTCDay() || 7;
    x.setUTCDate(x.getUTCDate() + 4 - day);
    return Math.ceil(((x.getTime() - Date.UTC(x.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
  }
  async function saveGrid() {
    const { subject, year } = termWhere();
    if (!subject || !year) {
      toast(t("tpNeedWhere"));
      return;
    }
    const rows = [];
    document.querySelectorAll("[data-gridrow]").forEach((tr) => {
      const topic = tr.querySelector('[data-gf="topic"]').value.trim();
      const note = tr.querySelector('[data-gf="note"]').value.trim();
      if (topic + "" + note !== tr.getAttribute("data-orig")) {
        rows.push({ week: tr.getAttribute("data-gridrow"), topic, note });
      }
    });
    if (!rows.length) {
      toast(t("tpNoChange"));
      return;
    }
    const { data, error } = await sb.rpc(
      "lk_term_plan_save",
      { p_subject: subject, p_year: year, p_rows: rows, p_source: "grid" }
    );
    if (error || data && data.ok === false) {
      toast(t("tpSaveFail") + " " + (error && error.message || data.error));
      return;
    }
    toast(fillT("tpGridSaved", { n: data.saved, c: data.cleared || 0 }));
    renderTermStored();
    loadTerm();
  }
  function renderTermPreview(rows, unclear) {
    const box = $("tp-preview");
    if (!rows || !rows.length) {
      box.innerHTML = '<div class="bcard fx" style="max-width:900px;margin-top:14px"><p class="note">' + esc(t("tpNothingRead")) + "</p>" + unclearBlock(unclear) + "</div>";
      return;
    }
    box.innerHTML = '<div class="bcard fx" style="max-width:900px;margin-top:14px"><h4>' + esc(fillT("tpReadH", { n: rows.length })) + '</h4><p class="hint">' + esc(t("tpReadNote")) + '</p><table class="tptable"><thead><tr><th>' + esc(t("tpWeek")) + "</th><th>" + esc(t("tpTopic")) + "</th><th>" + esc(t("tpNote")) + "</th></tr></thead><tbody>" + rows.map((r, i) => '<tr data-tprow="' + i + '"><td class="wk"><input value="' + esc(r.week) + '" inputmode="numeric" data-tpf="week"></td><td><input value="' + esc(r.topic || "") + '" data-tpf="topic"></td><td><input value="' + esc(r.note || "") + '" data-tpf="note"></td></tr>').join("") + "</tbody></table>" + unclearBlock(unclear) + '<div class="strow" style="margin-top:12px"><button class="btn btn-ok btn-sm" id="tp-save">' + esc(t("tpSave")) + '</button><button class="btn btn-ghost btn-sm" id="tp-discard">' + esc(t("tpDiscard")) + "</button></div></div>";
  }
  function unclearBlock(unclear) {
    if (!unclear || !unclear.length) return "";
    return '<div class="tpunclear"><b>' + esc(fillT("tpUnclear", { n: unclear.length })) + "</b><ul>" + unclear.slice(0, 20).map((u) => "<li>" + esc(u.text) + (u.why ? " \u2014 <i>" + esc(u.why) + "</i>" : "") + "</li>").join("") + "</ul></div>";
  }
  var TERM_WEEK = /^(?:vecka|veckor|v\.?|week|wk|w)?\s*(\d{1,2})(?:\s*[-–—]\s*(?:vecka|v\.?|week|wk|w)?\s*(\d{1,2}))?$/i;
  function schoolYearPos(w) {
    return w >= 32 ? w - 32 : w + 21;
  }
  function parseTermPaste(raw) {
    const rows = [], bad = [];
    let lines = 0;
    for (const line of String(raw || "").split(/\r?\n/)) {
      const ln = line.trim();
      if (!ln) continue;
      lines++;
      let wkCell, rest;
      if (ln.indexOf("	") >= 0) {
        const parts = ln.split("	").map((x) => x.trim());
        wkCell = parts[0];
        rest = parts.slice(1).filter((x, i) => i < 1 || x);
      } else {
        const m2 = /^([^;,:]{1,22}?)\s*[;,:]\s*(.+)$/.exec(ln) || /^((?:vecka|v\.?|week|wk|w)?\s*\d{1,2}(?:\s*[-–—]\s*\d{1,2})?)\s+[-–—]?\s*(.+)$/i.exec(ln);
        if (!m2) {
          bad.push({ text: ln, why: "no week" });
          continue;
        }
        wkCell = m2[1].trim();
        rest = [m2[2].trim()];
      }
      const m = TERM_WEEK.exec(wkCell || "");
      const topic = (rest[0] || "").trim();
      if (!m || !topic) {
        bad.push({ text: ln, why: m ? "no topic" : "no week" });
        continue;
      }
      const a = parseInt(m[1], 10), b = m[2] ? parseInt(m[2], 10) : a;
      if (a < 1 || a > 53 || b < 1 || b > 53) {
        bad.push({ text: ln, why: "week out of range" });
        continue;
      }
      const span = schoolYearPos(b) - schoolYearPos(a);
      if (span < 0 || span > 20) {
        bad.push({ text: ln, why: "odd week range" });
        continue;
      }
      const note = rest.slice(1).join(" \xB7 ");
      for (let k = 0; k <= span; k++) {
        const w = (schoolYearPos(a) + k + 32 - 1) % 53 + 1;
        const wk = w > 53 ? w - 53 : w;
        if (wk === 53 && a !== 53 && b !== 53) continue;
        rows.push({ week: wk, topic, note });
      }
    }
    return { rows, bad, lines };
  }
  function termPasteIsRows(r) {
    return r.rows.length > 0 && r.bad.length <= Math.max(1, Math.floor(r.lines * 0.25));
  }
  async function readTerm() {
    const raw = $("tp-raw").value.trim();
    if (!raw) {
      toast(t("tpPasteFirst"));
      return;
    }
    const { subject, year } = termWhere();
    const plain = parseTermPaste(raw);
    if (termPasteIsRows(plain)) {
      renderTermPreview(plain.rows, plain.bad.map((b) => ({ text: b.text, why: b.why })));
      return;
    }
    const btn = $("tp-read");
    btn.disabled = true;
    btn.textContent = t("tpReading");
    try {
      const { data, error } = await sb.functions.invoke(
        "lk-import",
        { body: { raw, subject, year_group: year } }
      );
      if (error || !data || data.error) {
        toast(t("tpReadFail") + " " + (data && data.detail || error && error.message || ""));
        return;
      }
      renderTermPreview(data.rows || [], data.unclear || []);
    } finally {
      btn.disabled = false;
      btn.textContent = t("tpRead");
    }
  }
  async function saveTerm() {
    const { subject, year } = termWhere();
    if (!subject || !year) {
      toast(t("tpNeedWhere"));
      return;
    }
    const rows = [...document.querySelectorAll("[data-tprow]")].map((tr) => {
      const f = (k) => tr.querySelector('[data-tpf="' + k + '"]').value.trim();
      return { week: f("week"), topic: f("topic"), note: f("note") };
    });
    const { data, error } = await sb.rpc(
      "lk_term_plan_save",
      { p_subject: subject, p_year: year, p_rows: rows, p_source: "paste" }
    );
    if (error) {
      toast(t("tpSaveFail") + " " + error.message);
      return;
    }
    if (data && data.ok === false) {
      toast(t("tpSaveFail") + " " + data.error);
      return;
    }
    $("tp-preview").innerHTML = "";
    $("tp-raw").value = "";
    toast(data.skipped ? fillT("tpSavedSome", { n: data.saved, s: data.skipped }) : fillT("tpSaved", { n: data.saved }));
    renderTermStored();
    loadTerm();
  }
  ["tp-subject", "tp-year"].forEach((id) => $(id).addEventListener("change", () => {
    $("tp-preview").innerHTML = "";
    renderTermStored();
  }));
  $("tp-reload").addEventListener("click", loadTerm);
  $("tp-read").addEventListener("click", readTerm);
  $("tp-pick").addEventListener("click", () => $("tp-file").click());
  $("tp-file").addEventListener("change", async (e) => {
    const input = e.target;
    const f = input.files && input.files[0];
    if (!f) return;
    $("tp-raw").value = await f.text();
    input.value = "";
    readTerm();
  });
  document.addEventListener("click", (e) => {
    const tg = e.target;
    if (tg.id === "tp-save") saveTerm();
    if (tg.id === "tp-gridsave") saveGrid();
    if (tg.id === "tp-discard") {
      $("tp-preview").innerHTML = "";
    }
  });
  function showScreen(which) {
    state.screen = which;
    const onPlans = which === "plans";
    $("screen-cover").hidden = which !== "cover";
    $("screen-plans").hidden = !onPlans;
    if (onPlans) showPlansTab(state.tab);
    renderNav();
    if (which === "cover") loadCoverPlans().then(renderRows).catch(() => {
    });
    setTitles();
    window.scrollTo(0, 0);
  }
  boot();
})();

/* GENERATED from app-src/lk.ts by tools/build-app.mjs. Edit the TypeScript, not this file. */
"use strict";
(() => {
  // app-src/lk-core.ts
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
  var SHELL = document.body.dataset.shell === "fvk" ? "fvk" : "lk";
  var ADDON = SHELL === "lk" || (() => {
    try {
      return localStorage.getItem("fvk.addon") !== "off";
    } catch {
      return true;
    }
  })();
  function setAddon(on) {
    try {
      localStorage.setItem("fvk.addon", on ? "on" : "off");
    } catch {
    }
    location.reload();
  }
  function setLangValue(l) {
    LANG = l;
  }
  function fillT(k, o) {
    return t(k).replace(/\{(\w+)\}/g, (_m, x) => String(o[x]));
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
  var state = {
    me: null,
    row: null,
    plan: null,
    bodies: null,
    planId: null,
    view: "coordinator",
    bank: [],
    screen: SHELL === "fvk" ? "cover" : "plans",
    fb: [],
    pending: 0,
    queue: [],
    extras: [],
    attn: [],
    fixes: {},
    model: null,
    cap: 20,
    uses: [],
    back: "bank",
    termCoverage: [],
    tab: "bank",
    checks: {},
    // Which shelf of the pool is open, remembered between visits.
    pool: { view: "shelf", sub: "", yr: "" },
    // lk.ts restores the last pick at start
    // The create-a-plan wizard, while it is open.
    cr: null,
    pshare: null,
    shareAi: void 0,
    hasOrigin: false,
    // Set once a plan is opened: who approved it and how.
    shareToken: void 0,
    approved: void 0,
    apprBy: void 0,
    apprName: void 0,
    apprRank: void 0,
    apprSubject: void 0,
    apprStale: void 0
  };
  var CHK = '<svg class="cl-ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path class="cl-link" d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path class="cl-link" d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/><path class="cl-tick" d="M5 12.5l4.5 4.5L19 7"/></svg>';
  var panelSeq = 0;
  function nextPanel() {
    return ++panelSeq;
  }
  function panelIs(seq) {
    return seq === panelSeq;
  }

  // app-src/lk-catalog.ts
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

  // app-src/lk-pool.ts
  var bankReady = Promise.resolve();
  var bankSeq = 0;
  function startBank() {
    bankReady = loadBank();
  }
  async function loadBank() {
    const seq = ++bankSeq;
    const scope = $("f-scope").value || "all";
    const approval = $("f-approval").value || "any";
    const origin = $("f-origin").value || "any";
    const args = { p_subject: null, p_year: null, p_scope: scope, p_approval: approval };
    if (origin !== "any") args.p_origin = origin;
    const { data, error } = await sb.rpc("lk_pool", args);
    if (seq !== bankSeq) return;
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
    if (state.bank.some((b) => b.origin)) state.hasOrigin = true;
    $("f-origin").hidden = !state.hasOrigin;
    fixed($("f-origin"), [["any", t("filtAnyOrigin")], ["ai", t("filtAi")], ["teacher", t("filtTeacherMade")]]);
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
    return '<div class="bcard pcard clickable" data-viewplan="' + b.id + '"><div class="pc-head"><h4>' + esc(rowTitle(b)) + "</h4>" + (b.approved ? '<button class="pc-copy" data-copylink="' + esc(b.share_token) + '" title="' + esc(t("copyLink")) + '">' + CHK + "</button>" : "") + "</div>" + originLine(b) + '<p class="pc-meta">' + (withYear ? '<span class="pc-yr">' + esc(yearLabel(b.year_group)) + "</span> \xB7 " : "") + b.minutes + " " + esc(t("min")) + (b.mine ? "" : " \xB7 " + esc(b.school || "")) + '</p><div class="pc-status">' + status + score + "</div>" + usedLine(b.id) + "</div>";
  }
  function originLine(b) {
    if (!b.origin) return "";
    const tch = b.origin === "teacher";
    return '<p class="pc-orig"><span class="orig ' + (tch ? "tch" : "ai") + '">' + esc(t(tch ? "origTeacher" : "origAi")) + "</span>" + (tch && b.author_name ? '<span class="muted">' + esc(b.author_name) + "</span>" : "") + (b.mine && b.share_allowed === false ? '<span class="orig loc">' + esc(t("localOnly")) + "</span>" : "") + "</p>";
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
  var ICON_SHELF = '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>';
  var ICON_COVER = '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>';
  function viewBtn(id, on, label, icon) {
    return '<button class="' + (on === id ? "on" : "") + '" data-poolview="' + id + '" aria-pressed="' + (on === id) + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icon + "</svg>" + esc(label) + "</button>";
  }
  function poolViewToggle() {
    const v = state.pool.view;
    const box = maybe$("poolview");
    if (!box) return;
    box.innerHTML = viewBtn("shelf", v, t("poolShelf"), ICON_SHELF) + viewBtn("cover", v, t("poolCover"), ICON_COVER);
  }
  function renderBank() {
    const g = $("bankgrid");
    poolViewToggle();
    if (!state.bank.length) {
      const scope = maybe$("f-scope")?.value;
      const appr = maybe$("f-approval")?.value;
      g.innerHTML = '<p class="note">' + esc(
        appr === "qualified" ? t("bankNoneQualified") : appr === "teacher" ? t("bankNoneTeacher") : scope === "shared" ? t("bankNoneShared") : t("bankEmpty")
      ) + '</p><p><button class="btn btn-primary" data-create="">+ ' + esc(t("crCreate")) + "</button></p>";
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
        if (!rows.length) return '<td><button class="cv empty" data-create="' + esc(s) + "|" + esc(y) + '" title="' + esc(t("crEmptyCell") + " \u2014 " + subjectLabel(s) + ", " + yearLabel(y)) + '">+</button></td>';
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
  var usesBy = /* @__PURE__ */ new Map();
  async function loadUses() {
    const { data } = await sb.rpc("lk_uses");
    state.uses = data || [];
    usesBy = /* @__PURE__ */ new Map();
    for (const u of state.uses) {
      const l = usesBy.get(u.plan_id);
      if (l) l.push(u);
      else usesBy.set(u.plan_id, [u]);
    }
  }
  function usedLine(planId) {
    const u = usesOf(planId);
    if (!u.length) return "";
    const last = u[0];
    return '<p class="shline used">' + esc(fillT("usedLast", { g: last.group_name, d: fmtDate(last.used_on) })) + (u.length > 1 ? " " + esc(fillT("usedTimes", { n: u.length })) : "") + "</p>";
  }
  function usesOf(planId, group) {
    const l = usesBy.get(planId) || [];
    return group ? l.filter((u) => u.group_name === group) : l;
  }
  function fmtDate(d) {
    return new Date(d).toLocaleDateString(LANG === "sv" ? "sv-SE" : "en-GB", { day: "numeric", month: "short" });
  }
  async function logUse(planId) {
    const r = state.row;
    if (!planId || !r || !r.group || r.group === "\u2014") return;
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

  // app-src/lk-approve.ts
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

  // app-src/lk-daily.ts
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
    const all2 = ROWS.map((r) => [hhmmToMins(r.start), hhmmToMins(r.end)]);
    const from = Math.floor(Math.min(...all2.map((x) => x[0])) / 60) * 60;
    const to = Math.ceil(Math.max(...all2.map((x) => x[1])) / 60) * 60;
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
    if (SHELL === "lk") return renderToday();
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
      const all2 = mine.length > 0 && cov === mine.length;
      return '<div class="schip' + (all2 ? " done" : "") + '"><span class="sname">' + esc(c.teacher) + "</span>" + (mine.length ? '<span class="sstat' + (all2 ? " ok" : "") + '">' + (all2 ? "\u2713 " + esc(t("cvChipCovered")) : cov + "/" + mine.length + " " + esc(t("cvChipCoveredN"))) + '</span><span class="sbar"><i class="' + (all2 ? "ok" : "") + '" style="width:' + Math.round(cov / mine.length * 100) + '%"></i></span>' : '<span class="sstat">' + esc(t("cvChipAbsent")) + "</span>") + (all2 ? '<span class="stick">\u2713</span>' : "") + "</div>";
    }).join("");
    const gap = ADDON ? ROWS.filter((r) => r.plannable && r.cover && !planSettled(r.id)).length : 0;
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
    return '<div class="blk ' + status + '" role="button" tabindex="0" data-blk="' + esc(b.id) + '" style="top:calc(' + topPct + "% + 1px);height:calc(" + hPct + '% - 3px);min-height:22px" title="' + esc([b.group, b.subject].filter(Boolean).join(" ") + " \xB7 " + b.time + (b.cover ? " \xB7 \u2713 " + b.cover : "")) + '"><p class="bt">' + esc(blockTitle(b)) + "</p>" + (px >= 34 ? '<p class="bm">' + esc(b.time) + "</p>" : "") + (px >= 48 && b.cover ? '<p class="bc">\u2713 ' + esc(b.cover) + "</p>" : "") + (ADDON && plan && LOUD !== "quiet" && px >= 30 ? planMark(plan) : "") + "</div>";
  }

  // app-src/lk-shell.ts
  function applyStatic() {
    document.querySelectorAll("[data-t]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-t") || "");
    });
    document.querySelectorAll("[data-lang]").forEach((b) => b.classList.toggle("on", b.getAttribute("data-lang") === LANG));
  }
  function setTitles() {
    const today2 = (/* @__PURE__ */ new Date()).toLocaleDateString(
      LANG === "sv" ? "sv-SE" : "en-GB",
      { weekday: "long", day: "numeric", month: "long", year: "numeric" }
    );
    const onPlans = state.screen === "plans";
    const tab = onPlans ? state.tab : "";
    const [title, sub] = state.screen === "today" ? [t("navToday"), today2] : state.screen === "create" ? [t("crTitle"), t("crLead")] : state.screen === "settings" ? [t("navSettings"), state.me?.school || ""] : tab === "feedback" ? [
      SHELL === "lk" ? t("tabFeedback") : t("titlePlans"),
      state.pending + " " + t("toReview") + " \xB7 " + state.fb.length + " " + t("plansCount")
    ] : tab === "term" && SHELL === "lk" ? [t("tabTerm"), t("tpLead")] : onPlans ? [t("titlePlans"), state.bank.length + " " + t("plansCount") + " \xB7 " + state.bank.filter((b) => b.shared).length + " " + t("sharedBetween")] : [t("titleCover"), today2];
    $("pagetitle").textContent = title;
    $("pagesub").textContent = sub;
  }
  var ICONS = {
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 15h2"/><path d="M14 15h2"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    plus: '<circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/>',
    wheel: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M3 12h18"/><path d="m5.6 5.6 12.8 12.8"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M9 10h6"/>',
    radar: '<circle cx="12" cy="12" r="10"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10"/><path d="M2 12h20"/>',
    grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
  };
  var NAV_LK = [
    { id: "today", icon: "calendar", key: "navToday", real: true },
    { id: "bank", icon: "book", key: "navPlans", real: true },
    { id: "create", icon: "plus", key: "navCreate", real: true },
    { id: "term", icon: "wheel", key: "tabTerm", real: true },
    { id: "feedback", icon: "message", key: "tabFeedback", real: true, badge: true },
    { id: "settings", icon: "settings", key: "navSettings", real: true }
  ];
  var NAV_FVK = [
    { id: "cover", icon: "users", key: "navCover", real: true },
    // Two doors for the add-on, and only for a school that has it: the plans
    // (bank, year planning and feedback as tabs) and Create a plan.
    { id: "plans", icon: "book", key: "navPlans", real: true, addon: true, badge: true },
    // The second door: making a plan is the other half of the product, and a
    // coordinator should not have to find it inside the bank.
    { id: "create", icon: "plus", key: "navCreate", real: true, addon: true },
    { id: "hub", icon: "clipboard", key: "navHub" },
    { id: "radar", icon: "radar", key: "navRadar" },
    { id: "dash", icon: "grid", key: "navDashboard" },
    { id: "set", icon: "settings", key: "navSettings" }
  ];
  var NAV = SHELL === "lk" ? NAV_LK : NAV_FVK.filter((n) => ADDON || !n.addon);
  function currentNav() {
    return SHELL === "lk" && state.screen === "plans" ? state.tab : state.screen;
  }
  function renderNav() {
    $("nav").innerHTML = NAV.map((n) => {
      const active = n.id === currentNav();
      const stroke = active ? "#0F71F6" : "rgba(255,255,255,0.45)";
      return '<button data-nav="' + n.id + '"' + (active ? ' class="on"' : "") + '><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n.icon] + '</svg><span class="lbl">' + esc(t(n.key)) + "</span>" + (n.badge && state.pending ? '<span class="chip chip-warn" style="font-size:10px;padding:1px 6px">' + state.pending + "</span>" : "") + (n.addon && !(n.badge && state.pending) ? '<span class="chip chip-blue" style="font-size:10px;padding:1px 6px">' + esc(t("addon")) + "</span>" : "") + "</button>";
    }).join("");
  }

  // app-src/lk-signin.ts
  var AUTH_KEY = "lk.mockAuth";
  function mockAuth() {
    if (EMBED) return { method: "fvk" };
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    } catch {
      return null;
    }
  }
  function showSignIn() {
    $("signin").hidden = false;
    applyStatic();
  }
  function mockSignIn(method) {
    let email;
    if (method === "email") {
      email = maybe$("si-email")?.value.trim() || "";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        toast(t("siBadEmail"));
        return;
      }
    }
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ method, email }));
    } catch {
    }
    $("signin").hidden = true;
    boot();
  }
  function authLabel() {
    const a = mockAuth();
    if (!a) return "";
    return t("via_" + a.method) + (a.email ? " \xB7 " + a.email : "");
  }
  function fvkLinkCard() {
    return '<h4 style="margin-top:18px">' + esc(t("fvkLinkTitle")) + '</h4><p class="hint">' + esc(t("fvkLinkNote")) + '</p><div class="covrow"><span class="chip chip-neutral">' + esc(t(EMBED ? "fvkLinked" : "fvkNotLinked")) + "</span>" + (EMBED ? "" : "<button data-fvklink>" + esc(t("fvkLinkBtn")) + "</button>") + "</div>";
  }

  // app-src/lk-term.ts
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
    renderTermCoverage();
    renderTermStored();
  }
  var TERM_FULL = 30;
  function renderTermCoverage() {
    const box = maybe$("tp-cov");
    if (!box) return;
    const cov = state.termCoverage;
    const by = new Map(cov.map((c) => [canonSubject(c.subject) + "|" + canonYear(c.year_group), c]));
    const subs = [.../* @__PURE__ */ new Set([...CATALOG_SUBJECTS, ...cov.map((c) => canonSubject(c.subject))])].filter(Boolean).sort((a, b) => subjectLabel(a).localeCompare(subjectLabel(b), LANG));
    const yrs = [.../* @__PURE__ */ new Set([...CATALOG_YEARS, ...cov.map((c) => canonYear(c.year_group))])].filter(Boolean).sort((a, b) => yearNum(a) - yearNum(b));
    const { subject: curS, year: curY } = termWhere();
    const planned = cov.length;
    const head = "<tr><th></th>" + yrs.map((y) => "<th>" + esc(y === "F" ? "F" : yearLabel(y).replace(/^\D+/, "")) + "</th>").join("") + "</tr>";
    const body = subs.map((s) => "<tr><th>" + esc(subjectLabel(s)) + "</th>" + yrs.map((y) => {
      const c = by.get(s + "|" + y);
      const n = Number(c?.weeks) || 0;
      const on = s === curS && y === curY ? " sel" : "";
      const tip = n ? fillT("tpCellTip", { n, a: c?.first_week ?? "", b: c?.last_week ?? "" }) + " \u2014 " + subjectLabel(s) + ", " + yearLabel(y) : t("tpCellEmpty") + " \u2014 " + subjectLabel(s) + ", " + yearLabel(y);
      return '<td><button class="cv ' + (n >= TERM_FULL ? "full" : n ? "some" : "empty") + on + '" data-tpcell="' + esc(s) + "|" + esc(y) + '" title="' + esc(tip) + '" aria-label="' + esc(tip) + '">' + (n || "+") + "</button></td>";
    }).join("") + "</tr>").join("");
    box.innerHTML = '<div class="bcard fx" style="max-width:900px"><h4>' + esc(t("tpCovH")) + '</h4><p class="hint">' + esc(fillT("tpCovNote", { n: planned, full: TERM_FULL })) + '</p><div class="poolcov"><table>' + head + body + '</table></div><p class="cvlegend"><span class="cv full">36</span>' + esc(fillT("tpLegFull", { n: TERM_FULL })) + '<span class="cv some">8</span>' + esc(t("tpLegSome")) + '<span class="cv empty">+</span>' + esc(t("tpCellEmpty")) + "</p></div>";
  }
  var GRID_WEEKS = (() => {
    const w = [];
    for (let i = 33; i <= 52; i++) w.push(i);
    for (let i = 1; i <= 26; i++) w.push(i);
    return w;
  })();
  var termShown = null;
  var termSeq = 0;
  async function renderTermStored() {
    const { subject, year } = termWhere();
    const box = $("tp-stored");
    const seq = ++termSeq;
    if (!subject || !year) {
      box.innerHTML = "";
      termShown = null;
      return;
    }
    const { data, error } = await sb.rpc("lk_term_plan", { p_subject: subject, p_year: year });
    if (seq !== termSeq) return;
    termShown = { subject, year };
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
    const { subject, year } = termShown || { subject: "", year: "" };
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
    loadTerm();
  }
  function wireTerm() {
    ["tp-subject", "tp-year"].forEach((id) => $(id).addEventListener("change", () => {
      $("tp-preview").innerHTML = "";
      renderTermCoverage();
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
  }

  // app-src/lk-feedback.ts
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
    state.shareAi = data && typeof data.share_ai === "boolean" ? data.share_ai : void 0;
    renderSettings();
  }
  function renderSettings() {
    const box = maybe$("settings-page") || maybe$("fbsettings");
    if (!box) return;
    box.innerHTML = "<h4>" + esc(t("capTitle")) + '</h4><p class="hint">' + esc(t("capNote")) + '</p><div class="covrow">' + [[5, "5"], [20, "20"], [-1, t("capUnlimited")]].map(([v, lbl]) => '<button data-cap="' + v + '"' + (state.cap === v ? ' class="on"' : "") + ">" + esc(lbl) + "</button>").join("") + "</div>" + // Only once the database knows the setting; an older one would just error.
    (state.shareAi === void 0 ? "" : '<h4 style="margin-top:18px">' + esc(t("shareAiTitle")) + '</h4><p class="hint">' + esc(t("shareAiNote")) + '</p><div class="covrow"><button data-shareai="1"' + (state.shareAi ? ' class="on"' : "") + ">" + esc(t("shareAiOn")) + '</button><button data-shareai="0"' + (!state.shareAi ? ' class="on"' : "") + ">" + esc(t("shareAiOff")) + "</button></div>") + // Lektionskollen on its own never mentions Frånvarokollen.
    (SHELL === "fvk" ? fvkLinkCard() : "");
  }
  async function loadFeedback() {
    loadSettings();
    await Promise.resolve(sb.rpc("lk_auto_review")).catch(() => null);
    const [ex, ov, rn] = await Promise.all([sb.rpc("lk_extras", { p_id: null }), sb.rpc("lk_feedback_overview"), sb.rpc("lk_feedback_runs")]);
    if (ex.error || ov.error) {
      $("fbqueue").innerHTML = '<p class="note">' + esc((ex.error || ov.error).message) + "</p>";
      return;
    }
    const extras = (ex.data || []).filter((x) => x.created_by_kind === "vikarie");
    state.extras = extras;
    state.queue = extras.filter((x) => !x.reviewed && !extraOk(x.body));
    const runs = rn.data || {};
    state.fb = (ov.data || []).map((x) => ({ ...x, runs: runs[x.id] || [] }));
    state.attn = attention();
    state.pending = state.attn.length;
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
  function extraOk(b) {
    if (!b) return false;
    const has = (b.lines || []).some((x) => String(x || "").trim()) || !!String(b.board || "").trim() || (b.tasks || []).length > 0;
    const pointer = (a) => !String(a || "").trim() || /^(se |see |enligt |as above|som ovan)/i.test(String(a).trim());
    return has && !(b.tasks || []).some((t2) => !String(t2.q || "").trim() || pointer(t2.a));
  }
  function attention() {
    const out = [];
    for (const p of state.fb) {
      const base = { plan: p.id, title: p.title || p.subject, subject: p.subject, year: p.year_group };
      const notesOf = (label) => (p.feedback?.notes || []).filter((n) => !label || n.section_label === label).map((n) => n.note);
      for (const x of p.sections || []) {
        const total = x.good + x.ok + x.bad;
        if (x.bad >= 2) out.push({ ...base, kind: "bad", ref: x.section_ref, label: x.section_label || x.section_ref, bad: x.bad, total, notes: [...x.notes || [], ...notesOf(x.section_label)] });
      }
      const byRef = /* @__PURE__ */ new Map();
      for (const h of p.heat || []) {
        const k = h.section_ref || "lesson";
        const v = byRef.get(k) || { n: 0, label: h.section_label, kinds: /* @__PURE__ */ new Set() };
        v.n += h.n;
        v.kinds.add(kindLabel(h.kind, ""));
        byRef.set(k, v);
      }
      byRef.forEach((v, ref) => {
        if (v.n >= 3 && !out.some((o) => o.plan === p.id && o.ref === ref)) {
          out.push({ ...base, kind: "help", ref, label: v.label || t("wholeLesson"), help: v.n, helpKinds: [...v.kinds].join(", "), notes: notesOf(v.label) });
        }
      });
      if ((p.ratings || 0) >= 3 && (p.yes || 0) / (p.ratings || 1) < 0.5) out.push({ ...base, kind: "low", bad: (p.ratings || 0) - (p.yes || 0), total: p.ratings });
    }
    for (const x of state.queue) {
      out.push({ kind: "extra", plan: x.plan_id || "", title: x.title || "", subject: x.subject, year: x.year_group, extra: x, label: x.section_label });
    }
    return out;
  }
  function fbSummary() {
    const weekAgo = Date.now() - 7 * 864e5;
    const runs = state.fb.flatMap((p) => p.runs || []).filter((r) => new Date(r.date).getTime() >= weekAgo);
    const answered = runs.filter((r) => r.answered);
    const stars2 = answered.map((r) => Number(String(r.stars || "").replace(",", "."))).filter((n) => n > 0);
    const avg = stars2.length ? (stars2.reduce((a, n) => a + n, 0) / stars2.length).toFixed(1).replace(".", LANG === "sv" ? "," : ".") : "\u2014";
    const auto = state.extras.filter((x) => x.reviewed && x.auto_reason && x.auto_reason !== "check_failed").length;
    const waiting = state.extras.filter((x) => !x.reviewed && extraOk(x.body)).length;
    const tile = (n, k, cls = "") => '<div class="fbtile' + cls + '"><b>' + esc(String(n)) + "</b><span>" + esc(t(k)) + "</span></div>";
    return '<div class="fbtiles">' + tile(runs.length, "fbTLessons") + tile(answered.length ? "\u2605 " + avg : "\u2014", "fbTStars") + tile(auto, "fbTAuto") + tile(state.attn.length, "fbTNeeds", state.attn.length ? " hot" : " calm") + "</div>" + (waiting ? '<p class="hint">' + esc(fillT("fbWaiting", { n: waiting })) + "</p>" : "");
  }
  function attnCard(a, i) {
    const head = '<div class="tags"><span class="chip chip-neutral">' + esc(subjectLabel(a.subject)) + '</span><span class="chip chip-neutral">' + esc(yearLabel(a.year)) + '</span><span class="chip ' + (a.kind === "extra" ? "chip-blue" : "chip-warn") + '">' + esc(t("fbWhy_" + a.kind)) + "</span></div><h4>" + esc(a.title) + "</h4>";
    if (a.kind === "extra") {
      const x = a.extra;
      return '<div class="bcard fx attn">' + head + '<p class="fbreason">' + esc(fillT("fbExtraFailed", { s: x.section_label || t("wholeLesson"), k: kindLabel(x.kind, x.variant) })) + "</p>" + extraText(x) + '<div style="display:flex;gap:6px"><button class="btn btn-ok btn-sm" data-review="' + x.id + ':1">' + esc(t("keep")) + '</button><button class="btn btn-ghost btn-sm" data-review="' + x.id + ':0">' + esc(t("hide")) + "</button></div></div>";
    }
    const why = a.kind === "bad" ? fillT("fbBadStep", { s: a.label, b: a.bad, n: a.total }) : a.kind === "help" ? fillT("fbHelpStep", { s: a.label, n: a.help, k: a.helpKinds }) : fillT("fbLowPlan", { b: a.bad, n: a.total });
    const key = a.plan + "|" + (a.ref || "");
    const fx = state.fixes[key];
    let fixBox = "";
    if (fx?.busy) fixBox = '<div class="fixbox"><span class="spin"></span> ' + esc(t("fbFixing")) + "</div>";
    else if (fx?.err) fixBox = '<div class="fixbox err">' + esc(fx.err) + "</div>";
    else if (fx?.after) fixBox = '<div class="fixbox">' + fixDiff(fx.before, fx.after) + '<div style="display:flex;gap:6px;margin-top:8px"><button class="btn btn-primary btn-sm" data-fbuse="' + i + '">' + esc(t("fbUseFix")) + '</button><button class="btn btn-ghost btn-sm" data-fbdrop="' + i + '">' + esc(t("fbDropFix")) + '</button></div><p class="hint">' + esc(t("fbFixReapprove")) + "</p></div>";
    return '<div class="bcard fx attn">' + head + '<p class="fbreason">' + esc(why) + "</p>" + ((a.notes || []).length ? a.notes.slice(0, 3).map((n) => "<blockquote>" + esc(n) + "</blockquote>").join("") : "") + (fixBox || '<div style="display:flex;gap:6px;flex-wrap:wrap">' + (a.kind !== "low" ? '<button class="btn btn-primary btn-sm" data-fbfix="' + i + '">\u2726 ' + esc(t("fbDraftFix")) + "</button>" : "") + '<button class="btn btn-ghost btn-sm" data-viewplan="' + a.plan + '">' + esc(t("openPlan")) + " \u2192</button></div>") + "</div>";
  }
  function fixDiff(before, after) {
    const flat = (o, path = "", acc = {}) => {
      if (o && typeof o === "object") {
        for (const [k, v] of Object.entries(o)) flat(v, path ? path + "." + k : k, acc);
      } else if (o != null && String(o).trim()) acc[path] = String(o);
      return acc;
    };
    const a = flat(before), b = flat(after);
    const keys = [.../* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]);
    if (!keys.length) return '<p class="hint">' + esc(t("fbNoChange")) + "</p>";
    return '<div class="fixdiff">' + keys.slice(0, 14).map((k) => '<div class="fd"><code>' + esc(k) + "</code>" + (a[k] ? "<del>" + esc(a[k]) + "</del>" : "") + (b[k] ? "<ins>" + esc(b[k]) + "</ins>" : "") + "</div>").join("") + (keys.length > 14 ? '<p class="hint">+' + (keys.length - 14) + "</p>" : "") + "</div>";
  }
  function renderFeedback() {
    const sum = maybe$("fbsummary");
    if (sum) sum.innerHTML = fbSummary();
    $("fbqueue").innerHTML = state.attn.length ? state.attn.map(attnCard).join("") : '<p class="note fbcalm">\u2713 ' + esc(t("fbAllGood")) + "</p>";
    $("fbplans").innerHTML = state.fb.length ? state.fb.map((p) => '<div class="bcard fx clickable" data-viewplan="' + p.id + '" title="' + esc(t("fbOpenHint")) + '"><h4>' + esc(p.title || p.subject) + '</h4><div class="tags"><span class="chip chip-neutral">' + esc(subjectLabel(p.subject)) + '</span><span class="chip chip-neutral">' + esc(yearLabel(p.year_group)) + "</span></div>" + fbBody(p) + '<div><span class="btn btn-soft btn-sm">' + esc(t("openPlan")) + " \u2192</span></div></div>").join("") : '<p class="note">' + esc(t("fbEmpty")) + "</p>";
    const auto = state.extras.filter((x) => x.reviewed);
    const ah = maybe$("fbautoH");
    if (ah) ah.textContent = fillT("fbAutoH", { n: auto.length });
    const ab = maybe$("fbauto");
    if (ab) ab.innerHTML = auto.length ? auto.map((x) => '<div class="bcard fx"><div class="tags"><span class="chip ' + (x.kept ? "chip-ok" : "chip-neutral") + '">' + esc(t(x.kept ? "fbKept" : "fbHidden")) + '</span><span class="chip chip-neutral">' + esc(t("fbReason_" + (x.auto_reason || "person"))) + '</span><span class="chip chip-blue">' + esc(kindLabel(x.kind, x.variant)) + '</span></div><div class="plan-meta">' + esc((x.title || "") + (x.section_label ? " \xB7 " + x.section_label : "")) + "</div>" + extraText(x) + "</div>").join("") : '<p class="note">\u2014</p>';
  }
  async function draftFix(i) {
    const a = state.attn[i];
    if (!a) return;
    const key = a.plan + "|" + (a.ref || "");
    state.fixes[key] = { busy: true };
    renderFeedback();
    const { data: pl, error } = await sb.rpc("lk_plan", { p_id: a.plan });
    if (error || !pl) {
      state.fixes[key] = { err: error?.message || t("errUnknown") };
      renderFeedback();
      return;
    }
    const res = await invokeGen({
      request: { subject: pl.subject, year_group: pl.year_group, minutes: pl.minutes, language: pl.language },
      fix: {
        plan: pl.body,
        ref: a.ref,
        label: a.label,
        language: pl.language,
        feedback: { bad: a.bad, total: a.total, help: a.help, helpKinds: a.helpKinds, notes: a.notes }
      }
    });
    if (res.error || res.data?.error || !res.data?.plan) {
      state.fixes[key] = { err: genErrText(res.data, res.error) };
    } else state.fixes[key] = { before: pl.body, after: res.data.plan };
    renderFeedback();
  }
  async function useFix(i) {
    const a = state.attn[i];
    if (!a) return;
    const key = a.plan + "|" + (a.ref || "");
    const fx = state.fixes[key];
    if (!fx?.after) return;
    const { data, error } = await sb.rpc("lk_update_plan_body", { p_id: a.plan, p_body: fx.after, p_note: fillT("fbFixNote", { s: a.label || "" }) });
    if (error || !data || data.ok === false) {
      toast(error?.message || t("errNeedsDb"), 8e3);
      return;
    }
    delete state.fixes[key];
    delete state.checks[a.plan];
    toast(t("fbFixed"));
    const { data: pl } = await sb.rpc("lk_plan", { p_id: a.plan });
    if (pl) {
      const other = pl.language === "en" ? "sv" : "en";
      (async () => {
        try {
          const tr = await invokeGen({ request: { subject: pl.subject, year_group: pl.year_group, minutes: pl.minutes, language: other }, translate: pl.body });
          if (!tr.error && tr.data?.plan) await sb.rpc("lk_fill_alt", { p_id: a.plan, p_language: other, p_body: tr.data.plan });
        } catch {
        }
      })();
    }
    loadFeedback();
  }
  function showPlansTab(which) {
    state.tab = which;
    $("tab-bank").hidden = which !== "bank";
    $("tab-feedback").hidden = which !== "feedback";
    $("tab-term").hidden = which !== "term";
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b.getAttribute("data-tab") === which));
    $("tabbadge").textContent = state.pending ? String(state.pending) : "";
    $("tabbadge").hidden = !state.pending;
    if (which === "bank") loadUses().catch(() => {
    }).then(() => loadBank());
    if (which === "feedback") loadFeedback();
    if (which === "term") loadTerm();
    setTitles();
  }

  // app-src/lk-assist.ts
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
    h += window.LKPlan.after(p, lbl) + '<section class="reg reg-plain"><div class="reg-h"><span class="n">&#9742;</span>' + esc(t("whoToCall")) + '</div><p style="font-size:13px"><b>' + esc(t("coordinator")) + "</b> \xB7 " + esc(state.me?.school || "") + (SHELL === "fvk" ? '<br><span style="color:var(--ink-soft)">' + esc(t("phoneNote")) + "</span>" : "") + "</p></section>";
    h += '<section class="reg reg-plain"><div class="reg-h"><span class="n">+</span>' + esc(t("assistTitle")) + '</div><p class="hint" style="margin:0 0 9px">' + esc(t("assistNote")) + '</p><div class="assist noprint"><span class="hint" style="align-self:center">' + esc(t("minLeft")) + "</span>" + [5, 10, 15, 20].map((m) => '<button data-fill="' + m + '">' + m + "</button>").join("") + "</div></section>";
    h += '<div class="foot"><span class="hint">' + esc(t("subSeesThis")) + '</span><span class="spacer"></span><button class="btn btn-ghost" data-view="coordinator">' + esc(t("back")) + "</button></div></div>";
    return h;
  }

  // app-src/lk-panel.ts
  async function usePlan(id, row = null) {
    const seq = nextPanel();
    const { data, error } = await sb.rpc("lk_plan", { p_id: id });
    if (!panelIs(seq)) return false;
    if (error || !data) {
      toast(t("errOpen"));
      return false;
    }
    state.view = "coordinator";
    const bodies = { [data.language || "sv"]: data.body };
    if (data.body_alt && data.language_alt) bodies[data.language_alt] = data.body_alt;
    state.bodies = bodies;
    state.plan = pickBody();
    state.planId = data.id;
    applyApproval(data);
    state.pshare = data.origin ? {
      origin: data.origin,
      author: data.author_name || null,
      allowed: !!data.share_allowed,
      choice: data.share_choice ?? null,
      mine: !!data.mine,
      shared: !!data.shared
    } : null;
    state.shareToken = data.share_token;
    state.model = data.model || null;
    state.row = row || { id: "", raw: "", subject: data.subject, year: data.year_group, group: "", mins: data.minutes, time: "", start: "", end: "", room: "", teacher: "", cover: null };
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
    return true;
  }
  function showPlan() {
    const r = state.row, p = state.plan;
    if (!r || !p) return;
    $("seam-state").textContent = state.approved ? t("seamApproved") : t("seamWaiting");
    const fallbackNote = bodyIsFallback() ? '<div class="flag" style="background:var(--warn-bg);color:#7c4a02"><span>!</span><div>' + esc(t("onlyInOther")) + "</div></div>" : "";
    const simNote = state.model === "canned" ? '<div class="flag sim"><span>\u26A0</span><div><b>' + esc(t("simTitle")) + "</b> " + esc(t("simBody")) + "</div></div>" : "";
    const fbRow = state.view === "coordinator" ? fbRowForOpenPlan() : null;
    const fbBox = fbRow ? '<div class="fx fbbox"><h4>' + esc(t("fbThisPlan")) + "</h4>" + fbBody(fbRow) + "</div>" : "";
    const head = '<div class="addin-body"><div class="addin-head"><div style="flex:1;min-width:0"><h2 id="addin-title" class="plan-title">' + esc(p.title) + '</h2><div class="plan-meta">' + esc([
      subjectLabel(r.subject),
      yearLabel(r.year),
      r.group,
      r.start ? r.start + "\u2013" + r.end : ""
    ].filter(Boolean).join(" \xB7 ")) + '</div></div><button class="x" data-close aria-label="' + esc(t("close")) + '">\u2715</button></div><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div class="viewtog"><button class="' + (state.view === "coordinator" ? "on" : "") + '" data-view="coordinator">' + esc(t("viewCoord")) + '</button><button class="' + (state.view === "vikarie" ? "on" : "") + '" data-view="vikarie">' + esc(t("viewSub")) + "</button></div>" + // The sidebar toggle sits behind this overlay, so the plan carries its own.
    (state.bodies && Object.keys(state.bodies).length > 1 ? '<div class="viewtog">' + ["sv", "en"].filter((c) => state.bodies?.[c]).map((c) => '<button class="' + (c === LANG ? "on" : "") + '" data-planlang="' + c + '">' + (c === "sv" ? "SV" : "EN") + "</button>").join("") + "</div>" : "") + '<span class="hint">' + (state.view === "coordinator" ? esc(t("coordHint")) : esc(t("subHint")) + " " + esc(p.readTime || "")) + "</span></div>";
    const check = state.planId ? state.checks[state.planId] : null;
    const checkNote = state.view === "coordinator" ? checkBanner(check) : "";
    const approveNote = state.view === "coordinator" && state.planId ? approveBar() : "";
    const staleNote = state.apprStale ? '<div class="flag" style="background:var(--warn-bg)"><span>!</span><div>' + esc(t("apprStaleWarn")) + "</div></div>" : "";
    $("addin-content").innerHTML = head + checkNote + staleNote + approveNote + simNote + fallbackNote + fbBox + (state.view === "coordinator" ? coordView(p, r) : vikarieView(p, r)) + "</div>";
  }
  function minDiff(a, b) {
    const [h1 = 0, m1 = 0] = a.split(":").map(Number), [h2 = 0, m2 = 0] = b.split(":").map(Number);
    return h2 * 60 + m2 - (h1 * 60 + m1);
  }
  function coordView(p, r) {
    const phases = p.phases || [];
    const sum = phases.reduce((a, ph) => {
      const m = String(ph.t || "").split("\u2013");
      return a + (m.length === 2 ? minDiff(m[0], m[1]) : 0);
    }, 0);
    const lt = subLinkToken();
    const link = lt ? planUrl(lt) : null;
    return '<div class="plan"><div class="ps" style="border:0;padding-top:4px"><h4>' + esc(t("whatItIs")) + "</h4><p>" + esc(p.summary) + '</p></div><div class="twocol"><div class="callout"><strong>' + esc(t("goal")) + "</strong>" + esc(p.goal) + '</div><div class="callout"><strong>' + esc(t("curriculum")) + '</strong><span style="font-size:12.5px">' + esc(p.curriculum) + '</span></div></div><div class="ps"><h4>' + esc(t("toCheck")) + "</h4><ul><li>" + esc(t("phasesSum")) + " <b>" + sum + " " + esc(t("min")) + "</b> \u2014 " + esc(t("lessonIs")) + " " + r.mins + " " + esc(t("min")) + ". " + (sum === r.mins ? '<span class="chip chip-ok">' + esc(t("matches")) + "</span>" : '<span class="chip chip-warn">' + esc(t("checkIt")) + "</span>") + "</li>" + // From the check, not assumed: a plan with blockers is not "all written".
    (() => {
      const ck = state.planId ? state.checks[state.planId] : null;
      return "<li>" + esc(t("allWritten")) + " " + (!ck ? '<span class="chip chip-neutral">' + esc(t("allWrittenUnknown")) + "</span>" : ck.blockers || 0 ? '<span class="chip chip-warn">' + esc(t("checkIt")) + "</span>" : '<span class="chip chip-ok">' + esc(t("ok")) + "</span>") + "</li>";
    })() + "<li>" + esc(t("requires")) + " " + esc(p.equipment?.need || "\u2014") + "</li></ul></div>" + (state.approved ? '<div class="flag" style="background:var(--ok-bg);color:#14532d"><span>\u2713</span><div><b>' + esc(t("approvedTitle")) + "</b> " + apprSignedLine() + " " + (link ? esc(t("subLink")) + ' <button type="button" class="linkchip mono" data-copylink="' + esc(lt) + '" title="' + esc(t("copyLink")) + '">' + CHK + '<span class="cl-label">' + esc(link) + "</span></button>" : "") + "</div></div>" : "") + shareTick() + '<div class="foot">' + (state.approved ? '<span class="spacer"></span><button class="btn btn-ghost" data-view="vikarie">' + esc(t("seeSubView")) + "</button>" + (link ? '<button class="btn btn-ghost" data-copymail="' + esc(lt) + '">' + CHK + '<span class="cl-label">' + esc(t("copyMail")) + "</span></button>" : "") + (link ? '<button class="btn btn-primary" data-copylink="' + esc(lt) + '">' + CHK + '<span class="cl-label">' + esc(t("copyLink")) + "</span></button>" : "") : '<span class="hint">' + esc(t("nothingBefore")) + '</span><span class="spacer"></span><button class="btn btn-ghost" data-frompool>' + esc(t("fromPool")) + '</button><button class="btn btn-ghost" data-regen>' + esc(t("regen")) + "</button>" + (state.planId ? apprButtons(0) : "")) + "</div></div>";
  }
  function shareTick() {
    const s = state.pshare;
    if (!s || !s.mine) return "";
    const hint = s.origin === "teacher" ? t("shareHintTeacher") : fillT("shareHintAi", { s: t(state.shareAi === false ? "setOff" : "setOn") });
    const now = !s.allowed ? t("shareOff") : s.shared ? t("shareNow") : t("shareWaits");
    return '<label class="sharetick"><input type="checkbox" data-shareplan' + (s.allowed ? " checked" : "") + "><span><b>" + esc(t("shareTitle")) + '</b> <span class="orig ' + (s.origin === "teacher" ? "tch" : "ai") + '">' + esc(t(s.origin === "teacher" ? "origTeacher" : "origAi")) + '</span><br><span class="hint">' + esc(now) + " " + esc(hint) + "</span></span></label>";
  }

  // app-src/lk-link.ts
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
    if (url && !/^https?:\/\//i.test(url)) {
      toast(t("cvPlNeedHttp"));
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
      usePlan(p.plan_id, r);
      return;
    }
    openAddin(ref);
  }

  // app-src/lk-cover.ts
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
    el.innerHTML = '<span class="lbl">' + esc(t("cvAddon")) + '</span><button class="' + (ADDON ? "on" : "") + '" data-addon="on">' + esc(t("cvAddonOn")) + '</button><button class="' + (!ADDON ? "on" : "") + '" data-addon="off">' + esc(t("cvAddonOff")) + "</button>" + (ADDON ? '<span class="lbl" style="margin-left:14px">' + esc(t("cvHow")) + "</span>" + [["quiet", "cvQuiet"], ["marked", "cvMarked"], ["nudge", "cvNudge"]].map(([v, k]) => '<button class="' + (LOUD === v ? "on" : "") + '" data-loud="' + v + '">' + esc(t(k)) + "</button>").join("") : "") + '<span class="hint">' + esc(t(ADDON ? "cvHowNote" : "cvAddonOffNote")) + "</span>";
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
    const planBtn = !ADDON ? "" : r.plannable ? planRow(r, plan) : '<p class="pnote">' + esc(t(r.whyKey || "whyRast")) + "</p>";
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

  // app-src/lk-wait.ts
  var waitTimer;
  var WAIT_EXPECT = 120;
  var OWL_SVG = '<svg class="owl" viewBox="0 0 140 130" aria-hidden="true"><ellipse cx="70" cy="122" rx="44" ry="5" fill="rgba(13,35,64,.12)"/><g class="owl-bob"><ellipse cx="70" cy="72" rx="36" ry="40" fill="#1b4776"/><path d="M40 62 Q30 80 38 100 Q46 90 46 72Z" fill="#153a62"/><path d="M100 62 Q110 80 102 100 Q94 90 94 72Z" fill="#153a62"/><ellipse cx="70" cy="84" rx="23" ry="26" fill="#e8f0fb"/><path d="M58 80 q4 4 8 0 M70 88 q4 4 8 0 M58 96 q4 4 8 0 M74 78 q3 3 6 0" stroke="#b8c9dc" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="56" cy="56" r="14" fill="#fff"/><circle cx="84" cy="56" r="14" fill="#fff"/><g class="owl-eyes"><circle cx="56" cy="59" r="6" fill="#0d2340"/><circle cx="84" cy="59" r="6" fill="#0d2340"/><circle cx="58" cy="57" r="2" fill="#fff"/><circle cx="86" cy="57" r="2" fill="#fff"/></g><g class="owl-lids"><ellipse cx="56" cy="56" rx="15" ry="15" fill="#1b4776"/><ellipse cx="84" cy="56" rx="15" ry="15" fill="#1b4776"/></g><path d="M65 66 L75 66 L70 75Z" fill="#f5a524"/><path d="M40 34 L70 22 L100 34 L70 46Z" fill="#0d2340"/><path d="M52 40 L52 48 Q70 56 88 48 L88 40 L70 46Z" fill="#0d2340"/><path class="owl-tassel" d="M100 34 L100 50" stroke="#f5a524" stroke-width="2.5" stroke-linecap="round"/></g><path d="M30 104 Q50 96 70 104 Q90 96 110 104 L110 120 Q90 112 70 120 Q50 112 30 120Z" fill="#fff" stroke="#1b4776" stroke-width="2"/><line x1="70" y1="104" x2="70" y2="120" stroke="#1b4776" stroke-width="1.5"/><g class="owl-ink" stroke="#1b4776" stroke-width="1.6" stroke-linecap="round"><line class="l1" x1="38" y1="106" x2="62" y2="104"/><line class="l2" x1="38" y1="111" x2="60" y2="109"/><line class="l3" x1="78" y1="104" x2="102" y2="106"/><line class="l4" x1="78" y1="109" x2="98" y2="111"/></g><g class="owl-pencil"><rect x="0" y="-2" width="22" height="5" rx="1" fill="#f5a524" transform="rotate(-35)"/><path d="M0 -2 L-5 0.5 L0 3Z" fill="#0d2340" transform="rotate(-35)"/></g></svg>';
  function waitHtml(what) {
    return '<div class="gen wait">' + OWL_SVG + '<div class="genstep" id="wait-what">' + esc(what) + '</div><div class="bar"><i id="wait-bar" style="width:3%"></i></div><div class="waitrow"><span id="wait-time" class="mono">0:00</span><span>\xB7</span><span>' + esc(t("waitUpTo")) + '</span></div><p class="hint waittip" id="wait-tip">' + esc(t("waitTip1")) + "</p></div>";
  }
  function startWait() {
    stopWait();
    const t0 = Date.now();
    const tips = ["waitTip1", "waitTip2", "waitTip3", "waitTip4", "waitTip5", "waitTip6"];
    waitTimer = window.setInterval(() => {
      const sec = Math.floor((Date.now() - t0) / 1e3);
      const tm = maybe$("wait-time");
      if (!tm) {
        stopWait();
        return;
      }
      tm.textContent = Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
      const pct = 3 + 92 * (1 - Math.exp(-sec / (WAIT_EXPECT * 0.6)));
      const bar = maybe$("wait-bar");
      if (bar) bar.style.width = pct.toFixed(1) + "%";
      const tip = maybe$("wait-tip");
      if (tip) tip.textContent = sec > WAIT_EXPECT ? t("waitLong") : t(tips[Math.floor(sec / 8) % tips.length]);
    }, 1e3);
  }
  function stopWait() {
    if (waitTimer) {
      clearInterval(waitTimer);
      waitTimer = void 0;
    }
  }
  function waitSay(what) {
    const el = maybe$("wait-what");
    if (el) el.textContent = what;
  }

  // app-src/lk-embed.ts
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
      }
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
    const seq = nextPanel();
    bankReady.then(() => {
      if (panelIs(seq) && !state.planId) showRequest();
    });
    toParent("lk:ready", { ref: EMBED.row.id });
  }
  function openAddin(id) {
    nextPanel();
    state.row = ROWS.find((x) => x.id === id) || null;
    state.plan = null;
    state.planId = null;
    state.view = "coordinator";
    state.pshare = null;
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
    stopWait();
    nextPanel();
    state.cr = null;
    if (EMBED) {
      toParent("lk:close", {});
      return;
    }
    state.row = null;
    $("overlay").hidden = true;
    document.body.style.overflow = "";
    document.body.classList.remove("panelmode");
    if (state.screen === "cover") loadCoverPlans().then(renderRows).catch(() => {
    });
    if (state.screen === "create") {
      const back = state.back;
      state.back = "bank";
      showScreen(back);
    }
  }

  // app-src/lk-generate.ts
  function showRequest() {
    const r = state.row;
    if (!r) return;
    $("seam-state").textContent = "lk:init";
    const matches = state.bank.filter((b) => canonSubject(b.subject) === canonSubject(r.subject) && canonYear(b.year_group) === canonYear(r.year) && b.approved);
    $("addin-content").innerHTML = '<div class="addin-body"><div class="addin-head"><div style="flex:1;min-width:0"><h2 id="addin-title">' + esc(t("planFor")) + " " + esc(r.group) + '</h2><div class="plan-meta">' + esc(r.teacher) + " \xB7 " + esc(r.time) + " \xB7 " + esc(r.room) + (r.cover ? " \xB7 " + esc(r.cover) : " \xB7 " + esc(t("uncovered").toLowerCase())) + '</div></div><button class="x" data-close aria-label="' + esc(t("close")) + '">\u2715</button></div><div class="derived"><div><dt>' + esc(t("subjectLbl")) + "</dt><dd>" + esc(subjectLabel(r.subject)) + '</dd><div class="from">' + esc(t("fromCode")) + ' "' + esc(r.raw) + '"</div></div><div><dt>' + esc(t("yearLbl")) + "</dt><dd>" + esc(yearLabel(r.year)) + '</dd><div class="from">' + esc(t("derivedFrom")) + ' "' + esc(r.group) + '"</div></div><div><dt>' + esc(t("lengthLbl")) + "</dt><dd>" + r.mins + " " + esc(t("min")) + '</dd><div class="from">' + esc(r.start) + "\u2013" + esc(r.end) + "</div></div></div>" + (r.practical ? '<div class="flag"><span>\u26A0</span><div><b>' + esc(t("practicalWarn")) + "</b> " + esc(t("practicalBody")) + "</div></div>" : "") + (matches.length ? '<div><div class="sect-h">' + esc(t("fromBank")) + " \u2014 " + matches.length + " " + esc(matches.length === 1 ? t("bankApproved") : t("bankApprovedPl")) + '</div><div class="bankrow">' + matches.map((b) => {
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
  async function invokeGen(body) {
    const r = await sb.functions.invoke("lk-generate", { body });
    if (r.error && !r.data) {
      try {
        const ctx = r.error.context;
        if (ctx && typeof ctx.json === "function") return { data: await ctx.json(), error: r.error };
      } catch {
      }
    }
    return r;
  }
  function genErrText(data, error) {
    const code = String(data?.error || "");
    if (code === "no_model") return t("errNoModel");
    if (code === "quota") return fillT("errQuota", { n: data?.limit ?? "" });
    if (code === "bad_output") return t("errBadOutput");
    if (code === "no_school") return t("errNoSchool");
    if (code === "too_large") return t("errTooLarge");
    if (code || error) console.warn("lk-generate", code, data?.detail, error);
    return t("errUnknown");
  }
  async function generate() {
    const req = gatherRequest();
    const seq = nextPanel(), row = state.row;
    const stillHere = () => panelIs(seq) && state.row === row;
    $("seam-state").textContent = t("seamGenerating");
    $("addin-content").innerHTML = waitHtml(t("genCalling"));
    startWait();
    const other = req.language === "en" ? "sv" : "en";
    const main = await invokeGen({ request: req });
    let alt = { error: new Error("skipped") };
    if (!main.error && !main.data?.error) {
      waitSay(t("genTranslating"));
      alt = await invokeGen({ request: { ...req, language: other }, translate: main.data.source === "model" ? main.data.plan : void 0 });
    }
    if (!stillHere()) return;
    stopWait();
    if (main.error || main.data?.error) {
      const msg = genErrText(main.data, main.error);
      $("addin-content").innerHTML = '<div class="addin-body"><div class="addin-head"><h2>' + esc(t("failed")) + '</h2><button class="x" data-close aria-label="' + esc(t("close")) + '">\u2715</button></div><div class="alert error">' + esc(msg) + '</div><div class="foot"><span class="spacer"></span><button class="btn btn-ghost" data-close>' + esc(t("cancel")) + '</button><button class="btn btn-primary" data-generate>' + esc(t("retry")) + "</button></div></div>";
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
    if (!stillHere()) {
      loadBank();
      return;
    }
    const bodies = { [req.language]: main.data.plan };
    if (altPlan) bodies[other] = altPlan;
    state.bodies = bodies;
    state.plan = pickBody();
    state.planId = pid || null;
    state.approved = false;
    applyApproval({});
    state.shareToken = null;
    state.pshare = null;
    state.view = "coordinator";
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
    state.apprRank = Number(d.approval_rank) || 0;
    state.apprBy = d.approved_name || null;
    state.apprSubject = d.approved_subject || null;
    state.apprStale = !!d.approval_stale;
  }

  // app-src/lk-create.ts
  var CR_KEY = "lk.creator";
  var CR_RANK = { coordinator: 1, teacher: 2, qualified: 3 };
  var crTimer;
  function crLoadWho() {
    try {
      const v = JSON.parse(localStorage.getItem(CR_KEY) || "{}");
      const role = v.role === "coordinator" || v.role === "qualified" ? v.role : "teacher";
      return { name: String(v.name || localStorage.getItem(APPROVER_KEY) || ""), role };
    } catch {
      return { name: "", role: "teacher" };
    }
  }
  function openCreate(subject, year) {
    const who = crLoadWho();
    state.cr = {
      step: who.name ? 2 : 1,
      name: who.name,
      role: who.role,
      subject: subject || state.pool.sub || CATALOG_SUBJECTS[0],
      year: year || state.pool.yr || "\xC5k 7",
      minutes: 60,
      topic: "",
      notes: "",
      lang: "sv",
      method: null,
      source: "",
      plan: {},
      mins: [],
      gaps: [],
      model: null,
      check: null,
      share: false,
      approve: true,
      busy: "",
      term: null
    };
    state.row = null;
    state.plan = null;
    state.planId = null;
    if (SHELL === "lk") {
      showScreen("create");
      if (state.cr.step === 2) crLoadTerm();
      return;
    }
    $("overlay").hidden = false;
    document.body.style.overflow = "hidden";
    $("seam-state").textContent = "create";
    renderCreate();
    if (state.cr.step === 2) crLoadTerm();
  }
  var CR_STEPS = ["crStepYou", "crStepLesson", "crStepHow", "crStepWrite", "crStepSave"];
  function renderCreate() {
    const c = state.cr;
    if (!c) return;
    const steps = '<ol class="crsteps">' + CR_STEPS.map((k, i) => '<li class="' + (i + 1 === c.step ? "on" : i + 1 < c.step ? "done" : "") + '"><span>' + (i + 1) + "</span>" + esc(t(k)) + "</li>").join("") + "</ol>";
    const body = c.busy ? crBusy() : c.step === 1 ? crYou() : c.step === 2 ? crLesson() : c.step === 3 ? crHow() : c.step === 4 ? crWrite() : crSave();
    const host = SHELL === "lk" && maybe$("create-page") || $("addin-content");
    host.innerHTML = '<div class="addin-body crwiz"><div class="addin-head"><div style="flex:1;min-width:0"><h2 id="addin-title">' + esc(t("crTitle")) + '</h2><div class="plan-meta">' + (c.step > 1 ? esc(c.name + " \xB7 " + t("crRole_" + c.role)) : esc(t("crLead"))) + (c.step > 2 ? " \xB7 " + esc(subjectLabel(c.subject) + " \xB7 " + yearLabel(c.year) + " \xB7 " + c.minutes + " " + t("min")) : "") + '</div></div><button class="x" data-close aria-label="\u2715">\u2715</button></div>' + steps + body + "</div>";
  }
  function crBusy() {
    return waitHtml(state.cr.busy);
  }
  function crYou() {
    const c = state.cr;
    const role = (r) => '<button class="crcard' + (c.role === r ? " on" : "") + '" data-crrole="' + r + '">' + apprStars(CR_RANK[r], "", true) + "<b>" + esc(t("crRole_" + r)) + "</b><span>" + esc(t("crRoleWhy_" + r)) + "</span></button>";
    return '<label class="f full">' + esc(t("crName")) + '<input id="cr-name" maxlength="80" autocomplete="name" value="' + esc(c.name) + '" placeholder="' + esc(t("apprNamePh")) + '"></label><div><div class="sect-h">' + esc(t("crWhoAreYou")) + '</div><div class="crcards">' + role("teacher") + role("qualified") + role("coordinator") + '</div><p class="hint">' + esc(t("crRoleNote")) + "</p></div>" + crFoot("", "crNext", "data-crnext");
  }
  function crLesson() {
    const c = state.cr;
    const opt2 = (list, cur, fmt) => list.map((x) => '<option value="' + esc(x) + '"' + (x === cur ? " selected" : "") + ">" + esc(fmt(x)) + "</option>").join("");
    const thisWeek = isoWeek(/* @__PURE__ */ new Date());
    const rows = (c.term || []).filter((r) => r.topic).map((r) => ({ ...r, w: Number(r.week) })).filter((r) => r.w >= thisWeek - 2 && r.w <= thisWeek + 3).sort((a, b) => a.w - b.w);
    const term = c.term === null ? '<p class="hint">' + esc(t("loading")) + "</p>" : rows.length ? '<div class="chips">' + rows.map((r) => '<button class="tog' + (c.topic === r.topic ? " on" : "") + '" data-crtopic="' + esc(String(r.topic)) + '" data-crnote="' + esc(String(r.note || "")) + '">' + esc(t("tpWeek")) + " " + r.w + (r.w === thisWeek ? " \u2605" : "") + " \xB7 " + esc(String(r.topic)) + "</button>").join("") + "</div>" : '<p class="hint">' + esc(t("crNoTerm")) + "</p>";
    return '<div class="steer"><label class="f">' + esc(t("subjectLbl")) + '<select id="cr-subject">' + opt2(CATALOG_SUBJECTS, c.subject, subjectLabel) + '</select></label><label class="f">' + esc(t("yearLbl")) + '<select id="cr-year">' + opt2(CATALOG_YEARS, c.year, yearLabel) + '</select></label><label class="f">' + esc(t("lengthLbl")) + '<select id="cr-min">' + [30, 40, 45, 50, 60, 70, 80, 90].map((m) => '<option value="' + m + '"' + (m === c.minutes ? " selected" : "") + ">" + m + " " + esc(t("min")) + "</option>").join("") + '</select></label><label class="f">' + esc(t("crLang")) + '<select id="cr-lang"><option value="sv"' + (c.lang === "sv" ? " selected" : "") + '>Svenska</option><option value="en"' + (c.lang === "en" ? " selected" : "") + '>English</option></select></label><label class="f full">' + esc(t("fTopic")) + '<input id="cr-topic" value="' + esc(c.topic) + '" placeholder="' + esc(t("fTopicPh")) + '"></label></div><div><div class="sect-h">' + esc(fillT("crTermH", { s: subjectLabel(c.subject), y: yearLabel(c.year) })) + "</div>" + term + "</div>" + crFoot("data-crback", "crNext", "data-crnext");
  }
  function crHow() {
    const c = state.cr;
    const card = (m, ico) => '<button class="crcard big' + (c.method === m ? " on" : "") + '" data-crmethod="' + m + '"><i>' + ico + "</i><b>" + esc(t("crM_" + m)) + "</b><span>" + esc(t("crMWhy_" + m)) + "</span></button>";
    let extra = "";
    if (c.method === "ai") {
      extra = '<label class="f full">' + esc(t("fNotes")) + '<textarea id="cr-notes" rows="3" placeholder="' + esc(t("fNotesPh")) + '">' + esc(c.notes) + '</textarea></label><p class="hint">' + esc(t("crAiNote")) + "</p>";
    } else if (c.method === "upload") {
      extra = '<div class="crdrop"><label class="btn btn-ghost">' + esc(t("crPickFile")) + '<input type="file" id="cr-file" accept=".docx,.pdf,.txt,.md,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden></label><span class="hint">' + esc(t("crFileKinds")) + '</span></div><label class="f full">' + esc(t("crPaste")) + '<textarea id="cr-source" rows="8" placeholder="' + esc(t("crPastePh")) + '">' + esc(c.source) + '</textarea></label><p class="hint">' + esc(t("crUploadNote")) + "</p>";
    }
    const go = c.method === "ai" ? "crGoAi" : c.method === "upload" ? "crGoUpload" : "crGoScratch";
    return '<div class="crcards three">' + card("ai", "\u2726") + card("upload", "\u21EA") + card("scratch", "\u270E") + "</div>" + extra + crFoot("data-crback", go, c.method ? "data-crgo" : "disabled");
  }
  function crWrite() {
    const c = state.cr;
    const p = c.plan;
    const inp = (path, label, val, ph = "", full = true) => '<label class="f' + (full ? " full" : "") + '">' + esc(label) + '<input data-cf="' + path + '" value="' + esc(String(val ?? "")) + '" placeholder="' + esc(ph) + '"></label>';
    const area = (path, label, val, rows = 2, ph = "") => '<label class="f full">' + esc(label) + '<textarea data-cf="' + path + '" rows="' + rows + '" placeholder="' + esc(ph) + '">' + esc(String(val ?? "")) + "</textarea></label>";
    const lines = (path, label, val, ph = "") => '<label class="f full">' + esc(label) + '<textarea data-cflines="' + path + '" rows="3" placeholder="' + esc(ph) + '">' + esc((val || []).join("\n")) + "</textarea></label>";
    const del = (path) => '<button class="crdel" data-crdel="' + path + '" title="' + esc(t("crRemove")) + '">\u2715</button>';
    const sec = (k, inner, open = true) => '<details class="crsec"' + (open ? " open" : "") + "><summary>" + esc(t(k)) + '</summary><div class="steer">' + inner + "</div></details>";
    const phases = (p.phases || []).map((ph, i) => '<div class="crrow full"><div class="crrow-h"><b>' + (i + 1) + '</b><input data-cf="phases.' + i + '.n" value="' + esc(ph.n || "") + '" placeholder="' + esc(t("crPhaseName")) + '"><input type="number" min="1" max="120" class="crmin" data-crmin="' + i + '" value="' + (c.mins[i] || "") + '"> ' + esc(t("min")) + del("phases." + i) + '</div><textarea data-cf="phases.' + i + '.say" rows="2" placeholder="' + esc(t("crPhaseSay")) + '">' + esc(ph.say || "") + '</textarea><textarea data-cf="phases.' + i + '.pupils" rows="2" placeholder="' + esc(t("crPhasePupils")) + '">' + esc(ph.pupils || "") + "</textarea></div>").join("");
    const sum = c.mins.reduce((a, x) => a + (x || 0), 0);
    const tasks = (p.tasks || []).map((tk, i) => '<div class="crrow full"><div class="crrow-h"><b>' + (i + 1) + '</b><select data-cf="tasks.' + i + '.tier">' + ["support", "core", "extension"].map((tr) => '<option value="' + tr + '"' + ((tk.tier || "core") === tr ? " selected" : "") + ">" + esc(t("crTier_" + tr)) + "</option>").join("") + "</select>" + del("tasks." + i) + '</div><textarea data-cf="tasks.' + i + '.q" rows="2" placeholder="' + esc(t("crTaskQ")) + '">' + esc(tk.q || "") + '</textarea><textarea data-cf="tasks.' + i + '.a" rows="1" placeholder="' + esc(t("crTaskA")) + '">' + esc(tk.a || "") + "</textarea></div>").join("");
    const m = p.model || {};
    const steps = (m.st || []).map((st, i) => '<div class="crrow full"><div class="crrow-h"><b>' + (i + 1) + '</b><input data-cf="model.st.' + i + '.b" value="' + esc(st.b || "") + '" placeholder="' + esc(t("crStepB")) + '">' + del("model.st." + i) + '</div><input data-cf="model.st.' + i + '.s" value="' + esc(st.s || "") + '" placeholder="' + esc(t("crStepS")) + '"></div>').join("");
    const gaps = c.gaps.length ? '<div class="flag" style="background:var(--warn-bg);color:#7c4a02"><span>!</span><div><b>' + esc(t("crGapsH")) + "</b><ul>" + c.gaps.map((g) => "<li>" + esc(g) + "</li>").join("") + "</ul></div></div>" : "";
    return gaps + crCheckBox() + sec("crSecBasics", inp("title", t("crPlanTitle"), p.title) + area("summary", t("crSummary"), p.summary, 2, t("crSummaryPh")) + inp("goal", t("goal"), p.goal, t("crGoalPh"))) + sec("crSecBefore", area("board", t("crBoard"), p.board, 3, t("crBoardPh")) + inp("equipment.need", t("crNeed"), p.equipment?.need, "", false) + inp("equipment.where", t("crWhere"), p.equipment?.where, "", false) + lines("first90", t("crFirst90"), p.first90, t("crFirst90Ph"))) + sec("crSecSteps", phases + '<div class="full crsum ' + (sum === c.minutes ? "ok" : "off") + '">' + esc(fillT("crSum", { a: sum, b: c.minutes })) + '</div><button class="btn btn-ghost btn-sm" data-cradd="phases">+ ' + esc(t("crAddPhase")) + "</button>") + sec("crSecModel", inp("model.p", t("crModelP"), m.p) + steps + '<button class="btn btn-ghost btn-sm full" data-cradd="model.st">+ ' + esc(t("crAddStep")) + "</button>" + inp("model.a", t("crModelA"), m.a), !!m.p) + sec("crSecTasks", '<p class="hint full">' + esc(t("crTiersNote")) + "</p>" + tasks + '<button class="btn btn-ghost btn-sm" data-cradd="tasks">+ ' + esc(t("crAddTask")) + "</button>") + sec("crSecEnd", inp("exit.q", t("crExitQ"), p.exit?.q) + inp("exit.a", t("crExitA"), p.exit?.a) + area("stuck", t("crStuck"), p.stuck, 1) + area("ahead", t("crAhead"), p.ahead, 1) + area("wrong", t("crWrong"), p.wrong, 1)) + crFoot("data-crback", "crToSave", "data-crnext");
  }
  function crCheckBox() {
    const v = state.cr.check;
    if (!v) return '<div class="crcheck" id="cr-check"><span class="hint">' + esc(t("crChecking")) + "</span></div>";
    const bl = (v.problems || []).filter((x) => x.level === "blocker");
    const wn = (v.problems || []).filter((x) => x.level !== "blocker");
    return '<div class="crcheck ' + (bl.length ? "bad" : "ok") + '" id="cr-check"><b>' + esc(bl.length ? fillT("crBlockers", { n: bl.length }) : t("crReady")) + "</b>" + (bl.length ? "<ul>" + bl.map((x) => "<li>" + esc((x.where ? x.where + ": " : "") + (x.detail || "")) + "</li>").join("") + "</ul>" : "") + (wn.length ? "<details><summary>" + esc(fillT("crWarnings", { n: wn.length })) + "</summary><ul>" + wn.map((x) => "<li>" + esc((x.where ? x.where + ": " : "") + (x.detail || "")) + "</li>").join("") + "</ul></details>" : "") + "</div>";
  }
  function crSave() {
    const c = state.cr;
    const v = c.check;
    const blocked = !v || (v.blockers || 0) > 0;
    const origin = c.method === "ai" ? "ai" : "teacher";
    const rank = CR_RANK[c.role];
    const label = '<div class="crlabel"><span class="orig ' + (origin === "ai" ? "ai" : "tch") + '">' + esc(t(origin === "ai" ? "origAi" : "origTeacher")) + "</span>" + (c.approve && !blocked ? apprStars(rank, c.name) + "<span>" + esc(fillT("crApprovedBy", { l: apprLevelName(rank), n: c.name })) + "</span>" : '<span class="chip chip-warn">' + esc(t("notApproved")) + "</span>") + "</div>";
    return '<div><div class="sect-h">' + esc(t("crLabelH")) + "</div>" + label + '</div><label class="sharetick"><input type="checkbox" data-crapprove' + (c.approve && !blocked ? " checked" : "") + (blocked ? " disabled" : "") + "><span><b>" + esc(fillT("crApproveAs", { l: apprLevelName(rank) })) + '</b><br><span class="hint">' + esc(blocked ? t("crCantApprove") : c.role === "qualified" ? fillT("crApproveQual", { s: subjectLabel(c.subject) }) : c.role === "teacher" ? t("crApproveTeacher") : t("crApproveCoord")) + '</span></span></label><label class="sharetick"><input type="checkbox" data-crshare' + (c.share ? " checked" : "") + "><span><b>" + esc(t("shareTitle")) + '</b><br><span class="hint">' + esc(origin === "teacher" ? t("crShareTeacher") : t("crShareAi")) + "</span></span></label>" + crFoot("data-crback", "crSaveBtn", "data-crsave");
  }
  function crFoot(back, nextKey, nextAttr) {
    return '<div class="foot">' + (back ? '<button class="btn btn-ghost" ' + back + ">\u2190 " + esc(t("crBack")) + "</button>" : "") + '<span class="spacer"></span><button class="btn btn-ghost" data-close>' + esc(t("cancel")) + '</button><button class="btn btn-primary" ' + nextAttr + ">" + esc(t(nextKey)) + (nextKey === "crSaveBtn" ? "" : " \u2192") + "</button></div>";
  }
  async function crLoadTerm() {
    const c = state.cr;
    if (!c) return;
    c.term = null;
    const { data } = await sb.rpc("lk_term_plan", { p_subject: c.subject, p_year: c.year });
    if (state.cr !== c) return;
    c.term = data || [];
    if (c.step === 2) renderCreate();
  }
  function crReadStep() {
    const c = state.cr;
    const v = (id) => maybe$(id)?.value;
    if (c.step === 1) c.name = (v("cr-name") || "").trim();
    if (c.step === 2) {
      c.subject = v("cr-subject") || c.subject;
      c.year = v("cr-year") || c.year;
      c.minutes = Number(v("cr-min")) || c.minutes;
      c.topic = v("cr-topic") || "";
      c.lang = v("cr-lang") === "en" ? "en" : "sv";
    }
    if (c.step === 3) {
      c.notes = v("cr-notes") ?? c.notes;
      c.source = v("cr-source") ?? c.source;
    }
  }
  function crRemember() {
    const c = state.cr;
    try {
      localStorage.setItem(CR_KEY, JSON.stringify({ name: c.name, role: c.role }));
      localStorage.setItem(APPROVER_KEY, c.name);
    } catch {
    }
  }
  function crMinsOf(p) {
    return (p.phases || []).map((ph) => {
      const m = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/.exec(ph.t || "");
      return m ? Math.max(0, +m[3] * 60 + +m[4] - (+m[1] * 60 + +m[2])) : 0;
    });
  }
  function crSetTimes() {
    const c = state.cr;
    let at = 0;
    const hhmm = (n) => String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
    (c.plan.phases || []).forEach((ph, i) => {
      const d = c.mins[i] || 0;
      ph.t = hhmm(at) + "\u2013" + hhmm(at + d);
      at += d;
    });
  }
  function crBlank() {
    const c = state.cr;
    const fixed = c.minutes >= 50 ? [5, 10, 10, 5, 5] : [4, 6, 6, 4];
    const rest = Math.max(1, c.minutes - fixed.reduce((a, x) => a + x, 0));
    const split = [...fixed.slice(0, 3), rest, ...fixed.slice(3)];
    c.mins = split;
    const names = c.lang === "en" ? ["Recap", "Worked example", "One together", "Independent work", "Exit question", "Round off"] : ["Repetition", "Genomg\xE5ng med exempel", "Ett tillsammans", "Eget arbete", "Exit-fr\xE5ga", "Avslutning"];
    return {
      title: c.topic || "",
      goal: "",
      summary: "",
      board: "",
      first90: [],
      equipment: { need: "", where: "" },
      phases: split.map((_, i) => ({ n: names[i] || "", say: "", pupils: "" })),
      tasks: [{ tier: "support", q: "", a: "" }, { tier: "core", q: "", a: "" }, { tier: "extension", q: "", a: "" }],
      exit: { q: "", a: "" },
      stuck: "",
      ahead: "",
      wrong: ""
    };
  }
  function crRequest() {
    const c = state.cr;
    return {
      subject: c.subject,
      year_group: c.year,
      minutes: c.minutes,
      topic: c.topic,
      notes: c.notes,
      lesson_type: "",
      resources: [],
      language: c.lang,
      group_name: null
    };
  }
  async function crGo() {
    const c = state.cr;
    crReadStep();
    if (c.method === "scratch") {
      c.plan = crBlank();
      crSetTimes();
      c.gaps = [];
      c.model = null;
      return crToWrite();
    }
    if (c.method === "upload" && !c.source.trim()) {
      toast(t("crNeedText"));
      return;
    }
    c.busy = t(c.method === "ai" ? "crBusyAi" : "crBusyUpload");
    renderCreate();
    startWait();
    const body = c.method === "ai" ? { request: crRequest() } : { request: crRequest(), convert: { text: c.source } };
    const { data, error } = await invokeGen(body);
    if (state.cr !== c) return;
    stopWait();
    c.busy = "";
    if (error || !data || data.error || !data.plan) {
      toast(data?.error === "empty_text" ? t("crNeedText") : genErrText(data, error), 8e3);
      renderCreate();
      return;
    }
    const plan = data.plan;
    c.gaps = Array.isArray(plan.gaps) ? plan.gaps.map(String) : [];
    delete plan.gaps;
    c.plan = plan;
    c.model = data.model || null;
    c.mins = crMinsOf(plan);
    if (!c.plan.phases?.length) {
      c.plan.phases = [{ n: "", say: "", pupils: "" }];
      c.mins = [c.minutes];
    }
    crSetTimes();
    crToWrite();
  }
  function crToWrite() {
    const c = state.cr;
    c.step = 4;
    c.check = null;
    c.share = c.method === "ai" ? state.shareAi !== false : false;
    renderCreate();
    crCheck();
  }
  function crCheck() {
    clearTimeout(crTimer);
    crTimer = window.setTimeout(async () => {
      const c = state.cr;
      if (!c) return;
      const { data } = await sb.rpc("lk_check_plan", { p_body: c.plan, p_minutes: c.minutes, p_language: c.lang });
      if (state.cr !== c) return;
      c.check = data || null;
      const box = maybe$("cr-check");
      if (box && c.step === 4) box.outerHTML = crCheckBox();
      else if (c.step === 5) renderCreate();
    }, 600);
  }
  function crSet(path, val) {
    const keys = path.split(".");
    let o = state.cr.plan;
    keys.slice(0, -1).forEach((k, i) => {
      const nextIsIdx = /^\d+$/.test(keys[i + 1]);
      if (o[k] == null) o[k] = nextIsIdx ? [] : {};
      o = o[k];
    });
    o[keys[keys.length - 1]] = val;
  }
  function crGet(path) {
    return path.split(".").reduce((o, k) => o == null ? o : o[k], state.cr.plan);
  }
  async function crExtract(file) {
    const name = file.name.toLowerCase();
    const load = (src) => new Promise((ok, bad) => {
      if (document.querySelector('script[src="' + src + '"]')) return ok();
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => ok();
      s.onerror = () => bad(new Error("load"));
      document.head.appendChild(s);
    });
    const w = window;
    if (name.endsWith(".docx")) {
      await load("https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js");
      const r = await w.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return String(r.value || "");
    }
    if (name.endsWith(".pdf")) {
      await load("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js");
      w.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
      const pdf = await w.pdfjsLib.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
      let out = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
        const pg = await pdf.getPage(i);
        const tc = await pg.getTextContent();
        out += tc.items.map((x) => x.str + (x.hasEOL ? "\n" : " ")).join("") + "\n\n";
      }
      return out;
    }
    return await file.text();
  }
  async function crSaveNow() {
    const c = state.cr;
    const origin = c.method === "ai" ? "ai" : "teacher";
    const approve = c.approve && !!c.check && (c.check.blockers || 0) === 0;
    c.busy = t("crSaving");
    renderCreate();
    const { data: pid, error } = await sb.rpc("lk_save_own_plan", {
      p_request: crRequest(),
      p_plan: c.plan,
      p_origin: origin,
      p_author: c.name,
      p_share: c.share,
      p_model: c.model
    });
    if (error || !pid) {
      c.busy = "";
      renderCreate();
      toast(error?.message || t("errNeedsDb"), 8e3);
      return;
    }
    if (approve) {
      const { data: ap } = await sb.rpc("lk_approve_as", { p_id: pid, p_kind: c.role, p_subject: c.subject, p_name: c.name });
      if (ap && ap.ok === false) toast(t(APPR_ERR[ap.error] || "errUnknown"));
      if (c.share) await sb.rpc("lk_set_plan_share", { p_id: pid, p_allow: true });
    }
    crRemember();
    const stillOpen = state.cr === c;
    state.cr = null;
    toast(t(approve ? "crSavedApproved" : "crSavedDraft"));
    loadBank();
    if (stillOpen) await usePlan(String(pid));
  }
  async function crClick(tg) {
    const c = state.cr;
    const open = tg.closest("[data-create]");
    if (open) {
      const [s, y] = (open.getAttribute("data-create") || "").split("|");
      openCreate(s || void 0, y || void 0);
      return true;
    }
    if (!c) return false;
    const role = tg.closest("[data-crrole]");
    if (role) {
      crReadStep();
      c.role = role.getAttribute("data-crrole");
      renderCreate();
      return true;
    }
    const meth = tg.closest("[data-crmethod]");
    if (meth) {
      crReadStep();
      c.method = meth.getAttribute("data-crmethod");
      renderCreate();
      return true;
    }
    const tp = tg.closest("[data-crtopic]");
    if (tp) {
      crReadStep();
      c.topic = tp.getAttribute("data-crtopic") || "";
      const note = tp.getAttribute("data-crnote");
      if (note) c.notes = note;
      renderCreate();
      return true;
    }
    if (tg.closest("[data-crback]")) {
      crReadStep();
      c.step = Math.max(1, c.step - 1);
      renderCreate();
      return true;
    }
    if (tg.closest("[data-crnext]")) {
      crReadStep();
      if (c.step === 1 && c.name.length < 2) {
        toast(t("errName"));
        return true;
      }
      if (c.step === 1) crRemember();
      c.step++;
      renderCreate();
      if (c.step === 2) crLoadTerm();
      if (c.step === 5) crCheck();
      return true;
    }
    if (tg.closest("[data-crgo]")) {
      await crGo();
      return true;
    }
    if (tg.closest("[data-crsave]")) {
      await crSaveNow();
      return true;
    }
    const add = tg.closest("[data-cradd]");
    if (add) {
      const path = add.getAttribute("data-cradd");
      const list = crGet(path) || [];
      list.push(path === "phases" ? { n: "", say: "", pupils: "" } : path === "tasks" ? { tier: "core", q: "", a: "" } : { b: "", s: "" });
      crSet(path, list);
      if (path === "phases") {
        c.mins.push(5);
        crSetTimes();
      }
      renderCreate();
      crCheck();
      return true;
    }
    const dl = tg.closest("[data-crdel]");
    if (dl) {
      const path = dl.getAttribute("data-crdel");
      const i = Number(path.split(".").pop());
      const listPath = path.split(".").slice(0, -1).join(".");
      crGet(listPath).splice(i, 1);
      if (listPath === "phases") {
        c.mins.splice(i, 1);
        crSetTimes();
      }
      renderCreate();
      crCheck();
      return true;
    }
    const ap = tg.closest("[data-crapprove]");
    if (ap) {
      c.approve = ap.checked;
      renderCreate();
      return true;
    }
    const sh = tg.closest("[data-crshare]");
    if (sh) {
      c.share = sh.checked;
      return true;
    }
    return false;
  }
  function wireCreate() {
    document.addEventListener("input", (e) => {
      const c = state.cr;
      if (!c) return;
      const el = e.target;
      if (el.dataset.cf) {
        crSet(el.dataset.cf, el.value);
        if (el.dataset.cf === "title" && !c.topic) c.topic = el.value;
        crCheck();
      } else if (el.dataset.cflines) {
        crSet(el.dataset.cflines, el.value.split("\n").map((x) => x.trim()).filter(Boolean));
        crCheck();
      } else if (el.dataset.crmin !== void 0) {
        c.mins[Number(el.dataset.crmin)] = Math.max(0, Number(el.value) || 0);
        crSetTimes();
        const s = document.querySelector(".crsum");
        const sum = c.mins.reduce((a, x) => a + (x || 0), 0);
        if (s) {
          s.textContent = fillT("crSum", { a: sum, b: c.minutes });
          s.className = "full crsum " + (sum === c.minutes ? "ok" : "off");
        }
        crCheck();
      }
    });
    document.addEventListener("change", async (e) => {
      const c = state.cr;
      if (!c) return;
      const el = e.target;
      if (el.dataset.cf && el.tagName === "SELECT") {
        crSet(el.dataset.cf, el.value);
        crCheck();
      }
      if ((el.id === "cr-subject" || el.id === "cr-year") && c.step === 2) {
        crReadStep();
        crLoadTerm();
      }
      if (el.id === "cr-file" && el.files && el.files[0]) {
        const f = el.files[0];
        try {
          const txt = await crExtract(f);
          c.source = txt.trim();
          const ta = maybe$("cr-source");
          if (ta) ta.value = c.source;
          toast(fillT("crFileRead", { f: f.name, n: c.source.length }));
        } catch {
          toast(t("crFileFail"), 8e3);
        }
      }
    });
  }

  // app-src/lk-today.ts
  var today = () => (/* @__PURE__ */ new Date()).toLocaleDateString("sv-SE");
  var LOW = 1;
  var plans = /* @__PURE__ */ new Map();
  var all = [];
  var ask = null;
  var found = false;
  var busy = false;
  async function loadPlans() {
    const { data } = await sb.rpc("lk_pool", { p_subject: null, p_year: null, p_scope: "all", p_approval: "any" });
    all = data || [];
    plans = new Map(all.map((p) => [p.id, p]));
  }
  async function loadToday() {
    try {
      await Promise.all([loadPlans(), loadUses()]);
    } catch {
    }
    renderToday();
  }
  var usesToday = () => state.uses.filter((u) => u.used_on === today()).sort((a, b) => (a.lesson_time || "99").localeCompare(b.lesson_time || "99"));
  function unused(subject, year, group) {
    const g = group.trim();
    const ok = all.filter((p) => p.approved && !p.approval_stale && p.subject === subject && p.year_group === year && !(g && usesOf(p.id, g).length));
    return [...ok.filter((p) => p.origin === "teacher"), ...ok.filter((p) => p.origin !== "teacher")];
  }
  var originChip = (p) => p.origin === "teacher" ? '<span class="tdst ok">' + esc(t("origTeacher")) + (p.author_name ? " \xB7 " + esc(p.author_name) : "") + "</span>" : '<span class="tdst draft">' + esc(t("origAi")) + "</span>";
  function stockChip(subject, year, group) {
    const n = unused(subject, year, group).length;
    if (n > LOW) return '<span class="tdstock">' + esc(fillT("tdLeft", { n, g: group })) + "</span>";
    return '<span class="tdst warn">' + esc(n ? fillT("tdLow", { n, g: group }) : fillT("tdOut", { g: group })) + "</span>";
  }
  function useCard(u) {
    const p = plans.get(u.plan_id);
    const [start = "", end = ""] = (u.lesson_time || "").split("\u2013");
    const title = p ? LANG !== p.language_alt ? p.title : p.title_alt || p.title : t("tdGone");
    const what = [u.group_name, p ? subjectLabel(p.subject) : "", p ? yearLabel(p.year_group) : ""].filter(Boolean).join(" \xB7 ");
    const link = u.run_token ? planUrl("r:" + u.run_token) : p ? planUrl(p.share_token) : "";
    return '<article class="tdcard"><div class="tdtime mono">' + esc(start || "\u2014") + "<span>" + esc(end) + '</span></div><div class="tdmain"><div class="tdtop"><b>' + esc(what) + "</b>" + (p ? originChip(p) : "") + '</div><p class="tdtitle">' + esc(title) + '</p><p class="tdmeta">' + [
      u.substitute ? esc(t("tdSubName")) + ": " + esc(u.substitute) : "",
      p ? stockChip(p.subject, p.year_group, u.group_name) : ""
    ].filter(Boolean).join(" \xB7 ") + "</p></div>" + (link ? '<a class="btn btn-ghost btn-sm tdopen" href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(t("tdOpen")) + "</a>" : "") + "</article>";
  }
  function opt(v, lbl, on) {
    return '<option value="' + esc(v) + '"' + (on ? " selected" : "") + ">" + esc(lbl) + "</option>";
  }
  function pickCard(p) {
    const title = LANG !== p.language_alt ? p.title : p.title_alt || p.title;
    return '<div class="tdpick"><div class="tdmain"><div class="tdtop"><b>' + esc(title) + "</b>" + originChip(p) + '</div><p class="tdmeta">' + [p.minutes ? p.minutes + " min" : "", p.mine === false && p.school ? esc(p.school) : ""].filter(Boolean).join(" \xB7 ") + '</p></div><a class="btn btn-ghost btn-sm" href="' + esc(planUrl(p.share_token)) + '" target="_blank" rel="noopener">' + esc(t("tdPreview")) + '</a><button class="btn btn-primary btn-sm" data-tduse="' + esc(p.id) + '"' + (busy ? " disabled" : "") + ">" + esc(t("tdUse")) + "</button></div>";
  }
  function results(a) {
    const list = unused(a.subject, a.year, a.group);
    const own = list.filter((p) => p.origin === "teacher");
    const lesson = esc(a.group) + " \xB7 " + esc(subjectLabel(a.subject)) + " \xB7 " + esc(yearLabel(a.year));
    const create = '<button class="btn btn-ghost btn-sm" data-tdcreate>' + esc(t("tdCreate")) + "</button>";
    if (!list.length) {
      return '<div class="tdres"><p class="tdempty"><b>' + esc(t("tdNoneLeft")) + "</b> " + lesson + '</p><p class="hint">' + esc(t("tdAskTeacher")) + '</p><div class="tdactions">' + create + "</div></div>";
    }
    return '<div class="tdres">' + (own.length ? "" : '<p class="hint tdnoteach">' + esc(t("tdNoTeacher")) + "</p>") + list.slice(0, 3).map(pickCard).join("") + '<p class="hint">' + esc(list.length === 1 ? t("tdMore1") : fillT("tdMore", { n: list.length })) + " " + create + "</p></div>";
  }
  function form(a) {
    return '<div class="bcard fx tdform"><h3>' + esc(t("tdPlanTitle")) + '</h3><p class="hint">' + esc(t("tdPlanLead")) + '</p><div class="tdgrid"><label class="f">' + esc(t("tdSubject")) + '<select id="td-subject">' + CATALOG_SUBJECTS.map((s) => opt(s, subjectLabel(s), s === a.subject)).join("") + '</select></label><label class="f">' + esc(t("tdYear")) + '<select id="td-year">' + CATALOG_YEARS.map((y) => opt(y, yearLabel(y), y === a.year)).join("") + '</select></label><label class="f">' + esc(t("tdClass")) + '<input id="td-class" maxlength="40" placeholder="7B" value="' + esc(a.group) + '"></label><label class="f">' + esc(t("tdSub")) + '<input id="td-sub" maxlength="80" value="' + esc(a.sub) + '"></label><label class="f">' + esc(t("tdStart")) + '<input id="td-start" type="time" value="' + esc(a.start) + '"></label><label class="f">' + esc(t("tdEnd")) + '<input id="td-end" type="time" value="' + esc(a.end) + '"></label></div><div class="foot"><span class="spacer"></span><button class="btn btn-ghost" data-tdcancel>' + esc(t("cancel")) + '</button><button class="btn btn-primary" data-tdfind>' + esc(t("tdFind")) + "</button></div>" + (found ? results(a) : "") + "</div>";
  }
  function renderToday() {
    const host = maybe$("today-page");
    if (!host) return;
    const list = usesToday();
    const low = list.filter((u) => {
      const p = plans.get(u.plan_id);
      return p && unused(p.subject, p.year_group, u.group_name).length <= LOW;
    }).length;
    const day = (/* @__PURE__ */ new Date()).toLocaleDateString(LANG === "sv" ? "sv-SE" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
    host.innerHTML = '<div class="tdhead card-elevated"><div class="tdsum"><p class="tdkicker">' + esc(day) + "</p><h2>" + esc(!list.length ? t("tdNoneToday") : list.length === 1 ? t("tdInUse1") : fillT("tdInUse", { n: list.length })) + '</h2><p class="hint" style="margin:0">' + esc(!low ? t("tdLead") : low === 1 ? t("tdLowSum1") : fillT("tdLowSum", { n: low })) + '</p></div><div class="tdactions"><button class="btn btn-primary" data-tdplan>' + esc(t("tdPlan")) + "</button></div></div>" + (ask ? form(ask) : "") + '<div class="tdlist">' + list.map(useCard).join("") + "</div>";
  }
  function readForm() {
    const v = (id) => (maybe$(id)?.value || "").trim();
    return { subject: v("td-subject"), year: v("td-year"), group: v("td-class"), start: v("td-start"), end: v("td-end"), sub: v("td-sub") };
  }
  function valid(a) {
    if (!a.group) {
      toast(t("tdNeedClass"));
      maybe$("td-class")?.focus();
      return false;
    }
    const m = (s) => {
      const [h = 0, mm = 0] = s.split(":").map(Number);
      return h * 60 + mm;
    };
    if (a.start && a.end && m(a.end) <= m(a.start)) {
      toast(t("tdBadTime"));
      return false;
    }
    return true;
  }
  async function use(planId) {
    const a = readForm();
    if (!a || !valid(a)) return;
    busy = true;
    renderToday();
    try {
      const { data, error } = await sb.rpc("lk_log_run", {
        p_plan_id: planId,
        p_group: a.group,
        p_substitute: a.sub || null,
        p_on: today(),
        p_time: a.start ? a.start + (a.end ? "\u2013" + a.end : "") : null
      });
      if (error || !data) {
        toast(error?.message || t("tdUseFail"));
        return;
      }
      toast(fillT("tdUsed", { g: a.group }));
      ask = null;
      found = false;
      await loadUses();
    } finally {
      busy = false;
      renderToday();
    }
  }
  function todayClick(tg) {
    if (tg.closest("[data-tdplan]")) {
      const hr = (/* @__PURE__ */ new Date()).getHours();
      ask = ask || { subject: CATALOG_SUBJECTS[0], year: "\xC5k 7", group: "", start: String(Math.min(hr + 1, 16)).padStart(2, "0") + ":00", end: "", sub: "" };
      found = false;
      renderToday();
      maybe$("td-class")?.focus();
      return true;
    }
    if (tg.closest("[data-tdcancel]")) {
      ask = null;
      found = false;
      renderToday();
      return true;
    }
    if (tg.closest("[data-tdfind]")) {
      const a = readForm();
      if (a && valid(a)) {
        ask = a;
        found = true;
        renderToday();
      }
      return true;
    }
    const u = tg.closest("[data-tduse]");
    if (u) {
      use(u.getAttribute("data-tduse"));
      return true;
    }
    if (tg.closest("[data-tdcreate]")) {
      const a = readForm() || ask;
      state.back = "today";
      openCreate(a?.subject, a?.year);
      return true;
    }
    return false;
  }

  // app-src/lk.ts
  state.pool = loadPoolPick();
  function setLang(l) {
    setLangValue(l);
    try {
      localStorage.setItem("lk.lang", l);
    } catch {
    }
    document.documentElement.lang = l;
    applyStatic();
    renderNav();
    if (state.me) $("username").textContent = state.me.role === "demo" ? t("demoRole") : state.me.role;
    const via = maybe$("userauth");
    if (via) via.textContent = authLabel();
    renderRows();
    renderBank();
    state.attn = attention();
    renderFeedback();
    renderSettings();
    fillFilterOptions();
    if (state.tab === "term") loadTerm();
    setTitles();
    if (state.bodies) state.plan = pickBody();
    if (!$("overlay").hidden) {
      if (state.cr && state.screen !== "create") renderCreate();
      else if (state.plan) showPlan();
      else if (state.row) showRequest();
    }
    if (state.screen === "create") renderCreate();
  }
  function boot() {
    document.documentElement.lang = LANG;
    applyStatic();
    if (!mockAuth()) {
      showSignIn();
      return;
    }
    renderNav();
    enterApp().then(() => Promise.all([loadFeedback(), loadUses()])).then(() => EMBED ? openEmbed() : void 0).catch(() => {
    });
  }
  $("signout").addEventListener("click", () => {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
    }
    location.reload();
  });
  async function enterApp() {
    const { data, error } = await sb.rpc("lk_me");
    if (error) {
      document.body.innerHTML = '<p style="padding:40px;font:14px Geist,sans-serif">' + esc(t("errDb")) + " " + esc(error.message) + "</p>";
      return;
    }
    if (!data || !data.school_id) {
      document.body.innerHTML = '<p style="padding:40px;font:14px Geist,sans-serif">' + esc(t("noDemoSchool")) + "</p>";
      return;
    }
    state.me = data;
    if (!EMBED) showScreen(SHELL === "lk" ? "bank" : "cover");
    $("app").hidden = false;
    $("schoolname").textContent = data.school;
    $("username").textContent = data.role === "demo" ? t("demoRole") : data.role;
    $("username").title = authLabel();
    const via = maybe$("userauth");
    if (via) via.textContent = authLabel();
    $("pagesub").textContent = (/* @__PURE__ */ new Date()).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    renderRows();
    startBank();
  }
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
    if (await crClick(tg)) return;
    if (todayClick(tg)) return;
    const fbf = tg.closest("[data-fbfix]");
    if (fbf) return draftFix(Number(fbf.getAttribute("data-fbfix")));
    const fbu = tg.closest("[data-fbuse]");
    if (fbu) return useFix(Number(fbu.getAttribute("data-fbuse")));
    const fbd = tg.closest("[data-fbdrop]");
    if (fbd) {
      const a2 = state.attn[Number(fbd.getAttribute("data-fbdrop"))];
      if (a2) delete state.fixes[a2.plan + "|" + (a2.ref || "")];
      return renderFeedback();
    }
    const tpc = tg.closest("[data-tpcell]");
    if (tpc) {
      const [cs, cy] = tpc.getAttribute("data-tpcell").split("|");
      $("tp-subject").value = cs;
      $("tp-year").value = cy;
      renderTermCoverage();
      await renderTermStored();
      $("tp-stored").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const tab = tg.closest("[data-tab]");
    if (tab) return showPlansTab(tab.getAttribute("data-tab"));
    const shp = tg.closest("[data-shareplan]");
    if (shp && state.planId) {
      const want = shp.checked;
      const { data, error } = await sb.rpc("lk_set_plan_share", { p_id: state.planId, p_allow: want });
      if (error || !data || data.error) {
        shp.checked = !want;
        toast(error?.message || t("errNeedsDb"));
        return;
      }
      if (state.pshare) {
        state.pshare.allowed = !!data.share_allowed;
        state.pshare.choice = want;
        state.pshare.shared = !!data.shared;
      }
      toast(t(want ? "shareOnToast" : "shareOffToast"));
      showPlan();
      loadBank();
      return;
    }
    const sai = tg.closest("[data-shareai]");
    if (sai) {
      const on = sai.getAttribute("data-shareai") === "1";
      const { error } = await sb.rpc("lk_set_share_ai", { p_on: on });
      if (error) {
        toast(error.message);
        return;
      }
      state.shareAi = on;
      renderSettings();
      toast(t("shareSaved"));
      loadBank();
      return;
    }
    if (tg.closest("[data-fvklink]")) {
      toast(t("authLater"));
      return;
    }
    const signin = tg.closest("[data-signin]");
    if (signin) return mockSignIn(signin.getAttribute("data-signin"));
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
    const addon = tg.closest("[data-addon]");
    if (addon) return setAddon(addon.getAttribute("data-addon") === "on");
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
    const el = tg.closest("[data-close],[data-generate],[data-approve],[data-regen],[data-frompool],[data-view],[data-planlang],[data-usebank],[data-res],[data-viewplan],[data-copylink],[data-copymail],[data-review],[data-cap],[data-nav],[data-lang],#refreshbank");
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
      const forRow = state.row;
      return usePlan(pid, forRow).then((ok) => ok ? logUse(pid).then(() => {
        if (state.planId === pid) showPlan();
      }) : void 0);
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
    if (e.key !== "Enter" && e.key !== " ") return;
    const blk = e.target.closest?.("[data-blk]");
    if (!blk) return;
    e.preventDefault();
    const r = blk.getBoundingClientRect();
    openPop(blk.getAttribute("data-blk"), r.right + 6, r.top);
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
  ["f-scope", "f-approval", "f-origin"].forEach((id) => $(id).addEventListener("change", loadBank));
  wireTerm();
  wireCreate();
  function showScreen(id) {
    let which = id;
    if (id === "bank" || id === "term" || id === "feedback") {
      state.tab = id;
      which = "plans";
    }
    if (which === "create" && !state.cr) {
      openCreate();
      return;
    }
    state.screen = which;
    for (const s of ["cover", "plans", "today", "create", "settings"]) {
      const el = maybe$("screen-" + s);
      if (el) el.hidden = s !== which;
    }
    if (which === "plans") showPlansTab(state.tab);
    if (which === "create") renderCreate();
    if (which === "settings") renderSettings();
    renderNav();
    if (which === "cover") loadCoverPlans().then(renderRows).catch(() => {
    });
    if (which === "today") loadToday();
    setTitles();
    window.scrollTo(0, 0);
  }
  boot();
})();

/* GENERATED from app-src/plan.ts by tools/build-app.mjs. Edit the TypeScript, not this file. */
"use strict";
(() => {
  // app-src/plan-labels.ts
  var SV_LABELS = {
    quickBtn: "\u23F1 Har du 5 minuter?",
    fullBtn: "Visa hela planen",
    quickTitle: "Snabbstart",
    quickHint: "Bara det du beh\xF6ver innan eleverna kommer in.",
    packBtn: "Skriv ut paket (plan + elevblad)",
    offlineNote: "Sparad kopia \u2013 du \xE4r offline.",
    linkedKicker: "Lektionsplan fr\xE5n skolan",
    linkedFrom: "Ordinarie l\xE4rares plan",
    linkedNote: "Instruktion fr\xE5n ordinarie l\xE4rare",
    linkedBody: "Den h\xE4r lektionen har en plan som skolan redan hade. \xD6ppna den med knappen och ber\xE4tta sedan hur l\xE5ngt ni kom.",
    noteBody: "Ordinarie l\xE4rare l\xE4mnade de h\xE4r instruktionerna. Ber\xE4tta efter\xE5t hur l\xE5ngt ni kom.",
    linkedNoteH: "Fr\xE5n ordinarie l\xE4rare",
    linkedOpen: "\xD6ppna planen",
    linkedPeek: "Visa den h\xE4r p\xE5 sidan",
    linkedFallback: "Syns inget eller fel sida? Anv\xE4nd knappen ovan \u2014 alla sidor g\xE5r inte att visa inb\xE4ddade.",
    linkedNoRate: "Den h\xE4r planen betygs\xE4tts inte. Vi fr\xE5gar bara hur l\xE5ngt ni kom, s\xE5 att ordinarie l\xE4rare vet var klassen st\xE5r.",
    qReuse: "Skulle du anv\xE4nda den h\xE4r planen igen?",
    aReuseYes: "Ja, som den \xE4r",
    aReuseChanges: "Ja, med \xE4ndringar",
    aReuseNo: "Nej",
    savedSoFar: "Sparat. Svara g\xE4rna p\xE5 de andra ocks\xE5.",
    noCode: "L\xE4nken saknar kod.",
    linkedUntil: "Tillg\xE4nglig till",
    linkedGoneH: "Den h\xE4r planen har g\xE5tt ut",
    linkedGoneB: "Ordinarie l\xE4rares plan visas bara en kort tid efter lektionen. H\xF6r av dig till skolan om du beh\xF6ver den igen.",
    runUntil: "L\xE4nken g\xE4ller till",
    runExpiredH: "Den h\xE4r l\xE4nken har g\xE5tt ut",
    runExpiredB: "Lektionen med {g} var {d}. Be skolan om en ny l\xE4nk om du beh\xF6ver planen igen.",
    notFound: "Planen hittades inte. Den kan ha tagits bort, eller inte vara godk\xE4nd \xE4nnu. H\xF6r av dig till skolan.",
    depthQ: "Hur mycket vill du ha utskrivet?",
    depthFull: "Allt",
    depthGuided: "Huvuddragen",
    depthBrief: "Bara ramen",
    theLesson: "Lektionen",
    fbGood: "Bra",
    fbOk: "Okej",
    fbBad: "D\xE5ligt",
    fbOpen: "L\xE4mna feedback",
    fbOpenSub: "Inte en del av lektionen \xB7 cirka 2 minuter",
    fbStarsQ: "Hur var lektionen som helhet?",
    fbStar1: "D\xE5lig",
    fbStar5: "Mycket bra",
    getReady: "G\xF6r i ordning",
    readySheet: "Elevblad",
    readySheetHint: "Skriv ut det, eller skriv av det p\xE5 tavlan.",
    readyBoard: "Skriv p\xE5 tavlan",
    readyKit: "Ta fram",
    readyGoal: "M\xE5let",
    readyDone: "Klart \u2013 d\xF6lj",
    readyShow: "Visa igen",
    readyAllDone: "Allt \xE4r klart. Dags att b\xF6rja.",
    stepOf: "Steg {i} av {n}",
    stepDone: "Klar \u2013 n\xE4sta steg",
    stepReopen: "\xD6ppna igen",
    nextUp: "N\xE4sta:",
    lastStep: "Sista steget. D\xE4refter: feedback.",
    stepNow: "P\xE5g\xE5r",
    shortBtn: "Kort om tid?",
    shortOff: "Visa hela",
    shortNote: "Hoppa \xF6ver steg m\xE4rkta \u201CKan hoppas \xF6ver\u201D och ge bara standarduppgifterna.",
    canSkip: "Kan hoppas \xF6ver",
    fbSteps: "Hur gick varje steg?",
    fbSkipped: "Hoppade \xF6ver",
    fbNotePh: "Vad b\xF6r \xE4ndras? (valfritt)",
    fbJump: "L\xE4mna feedback \u2193",
    fbSavedS: "Sparat",
    fbIntro: "Tv\xE5 minuter, helt frivilligt. Det du skriver h\xE4r g\xF6r planen b\xE4ttre f\xF6r n\xE4sta vikarie.",
    ifWrong: "Om n\xE5got g\xE5r snett",
    afterH: "Efter lektionen",
    recallWhy: "Bygger p\xE5",
    modelWrite: "Skriv p\xE5 tavlan",
    modelSay: "S\xE4g medan du skriver",
    modelAns: "Svar",
    miscH: "Vanliga fel \u2014 och vad du s\xE4ger",
    miscWhy: "Varf\xF6r de svarar s\xE5",
    miscSay: "S\xE4g d\xE5",
    whereH: "Var sakerna finns",
    railWhere: "Du \xE4r h\xE4r",
    teachBtn: "\u25B6 Starta lektionen",
    teachHint: "Ett steg i taget, helsk\xE4rm. B\xF6rja h\xE4r n\xE4r du st\xE5r i klassrummet.",
    prepBtn: "\u2190 Hela planen",
    projBtn: "Visa f\xF6r klassen",
    nextPhase: "N\xE4sta",
    prevPhase: "Tillbaka",
    phaseOf: "av",
    projHint: "St\xE4ng",
    projDeck: "Visa hela lektionen",
    projModel: "Exempel p\xE5 tavlan",
    projPart: "Del {i} av {n}",
    projEnd: "Slut p\xE5 den h\xE4r delen",
    projStop: "Stanna h\xE4r. G\xE5 vidare n\xE4r klassen \xE4r klar.",
    projNextPart: "N\xE4sta del",
    projDone: "Lektionen \xE4r slut.",
    projStep: "Steg",
    projTasks: "Uppgifter",
    projExit: "Innan ni g\xE5r",
    projGoal: "M\xE5let med lektionen",
    projPrev: "\u2039 F\xF6reg\xE5ende",
    projNext: "N\xE4sta \u203A",
    tierQ: "Uppgifter:",
    tierSupport: "Mer st\xF6d",
    tierStandard: "Standard",
    tierChallenge: "Mer utmaning",
    tierHint: "Samma m\xE5l, tre niv\xE5er. Byt n\xE4r som helst \u2014 eleverna ser ingen niv\xE5 p\xE5 sitt blad.",
    tKicker: "Din lektion medan du var borta",
    tSubSaid: "Vad vikarien sa",
    tQuestion: "Var det h\xE4r r\xE4tt f\xF6r din klass?",
    tWhy: "Du \xE4r den enda som kan avg\xF6ra om inneh\xE5llet st\xE4mde. Samordnaren kan det inte, och vikarien kan bara s\xE4ga om den gick att h\xE5lla.",
    tRight: "Ja, r\xE4tt",
    tMostly: "Mest r\xE4tt",
    tWrong: "Nej",
    tNoteLbl: "Vad var fel? (valfritt)",
    tNotePh: "T.ex. \u201DVi hade redan gjort det h\xE4r\u201D eller \u201DFacit p\xE5 uppgift 2 \xE4r fel\u201D",
    tNoteHint: "G\xE5r till samordnaren. En plan du s\xE4ger \xE4r fel plockas ur den delade poolen.",
    tThePlan: "Planen de fick",
    tThanks: "Tack \u2014 ditt svar \xE4r sparat.",
    covLeftLbl: "Stannade vid",
    covTitle: "Hur l\xE5ngt kom ni?",
    covAll: "Hela planen",
    covPart: "En del",
    covNone: "Knappt n\xE5got",
    leftLbl: "Anteckning till ordinarie l\xE4rare (valfritt)",
    leftOff: 'T.ex. "Hann uppgift 1\u20134, tog slut p\xE5 tid"',
    leftHint: "Sparas s\xE5 att ordinarie l\xE4rare kan l\xE4sa den.",
    forStudents: "Elevblad",
    print: "Skriv ut",
    copyText: "Kopiera text",
    close: "St\xE4ng",
    copiedTxt: "Kopierad",
    studentSheet: "Elevblad (utan facit)",
    first90: "De f\xF6rsta 90 sekunderna",
    goal: "M\xE5l:",
    board: "Skriv p\xE5 tavlan innan lektionen b\xF6rjar",
    need: "Du beh\xF6ver:",
    clock: "Lektionen, p\xE5 klockan",
    say: "S\xE4g",
    pupils: "Eleverna:",
    expect: "F\xF6rv\xE4ntat:",
    check: "Kontrollfr\xE5ga:",
    answer: "Svar:",
    tasks: "Uppgifter med facit",
    stuck: "Fastnar",
    ahead: "Klara tidigt",
    wrong: "Om det g\xE5r snett",
    exit: "Exit ticket",
    handover: "\xD6verl\xE4mning till ordinarie l\xE4rare",
    yes: "Ja",
    no: "Inte som den \xE4r",
    whyTitle: "Vad var det som inte st\xE4mde? (frivilligt)",
    thanks: "Tack \u2014 ditt svar \xE4r sparat.",
    saveFail: "Kunde inte spara: ",
    // live assist
    aExplain: "F\xF6rklara p\xE5 nytt s\xE4tt",
    aExercise: "Fler \xF6vningar p\xE5 detta",
    aEasier: "L\xE4ttare",
    aHarder: "Sv\xE5rare",
    barLbl: "Tid kvar att fylla (min):",
    working: "Tar fram n\xE5got\u2026",
    srcLibrary: "Simulerat st\xF6d \u2013 ingen AI-modell ansluten \xE4n",
    srcCache: "Sparat svar fr\xE5n tidigare",
    srcStored: "Ytterligare inneh\xE5ll \u2013 sparat tidigare i den h\xE4r planen",
    genNew: "Skapa ett nytt",
    simBanner: "Simulerad plan \u2013 ingen AI-modell \xE4r ansluten \xE4n.",
    srcModel: "Genererat under lektionen",
    srcFallback: "F\xE4rdigskrivet st\xF6d (modellen svarade inte)",
    boardNow: "Skriv upp p\xE5 tavlan",
    tasksNow: "Uppgifter med facit",
    saved: "Sparat i planen \u2014 markerat f\xF6r granskning.",
    quota: "Dagens gr\xE4ns f\xF6r lektionshj\xE4lp \xE4r n\xE5dd f\xF6r den h\xE4r planen.",
    onlyOther: "Finns bara p\xE5 svenska",
    whatHappened: "Vad h\xE4nde? (frivilligt, en rad)",
    whatHappenedPh: "t.ex. de fastnade p\xE5 n\xE4mnaren",
    noteSaved: "Tack \u2014 sparat med planen.",
    pickCovFirst: "V\xE4lj f\xF6rst hur l\xE5ngt ni kom.",
    xvQ: "Hj\xE4lpte det h\xE4r?",
    xvUp: "\u{1F44D} Ja",
    xvDown: "\u{1F44E} Nej",
    xvThanks: "Tack! N\xE4sta vikarie f\xE5r det du tyckte.",
    commentTitle: "Vad funkade, vad funkade inte? (frivilligt)",
    commentPh: "En rad r\xE4cker. Det \xE4r det h\xE4r ordinarie l\xE4rare och vi har mest nytta av.",
    send: "Skicka",
    reasons: {
      short: "Tog f\xF6r kort tid",
      long: "Tog f\xF6r l\xE5ng tid",
      materials: "Materialet funkade inte",
      unclear: "Otydliga instruktioner"
    }
  };
  var EN_LABELS = {
    quickBtn: "\u23F1 Got 5 minutes?",
    fullBtn: "Show full plan",
    quickTitle: "Quick start",
    quickHint: "Only what you need before the pupils walk in.",
    packBtn: "Print pack (plan + student sheet)",
    offlineNote: "Saved copy \u2013 you are offline.",
    linkedKicker: "Lesson plan from the school",
    linkedFrom: "The class teacher's plan",
    linkedNote: "Instructions from the class teacher",
    linkedBody: "This lesson has a plan the school already had. Open it with the button, then tell us how far you got.",
    noteBody: "The class teacher left these instructions. Tell us afterwards how far you got.",
    linkedNoteH: "From the class teacher",
    linkedOpen: "Open the plan",
    linkedPeek: "Show it on this page",
    linkedFallback: "Nothing showing, or the wrong page? Use the button above \u2014 not every page can be displayed embedded.",
    linkedNoRate: "This plan is not rated. We only ask how far you got, so the class teacher knows where the class is.",
    qReuse: "Would you use this plan again?",
    aReuseYes: "Yes, as it is",
    aReuseChanges: "Yes, with changes",
    aReuseNo: "No",
    savedSoFar: "Saved. Please answer the others too.",
    noCode: "The link is missing its code.",
    linkedUntil: "Available until",
    linkedGoneH: "This plan has expired",
    linkedGoneB: "The class teacher's plan is only shown for a short time after the lesson. Get in touch with the school if you need it again.",
    runUntil: "Link valid until",
    runExpiredH: "This link has expired",
    runExpiredB: "The lesson with {g} was on {d}. Ask the school for a new link if you need the plan again.",
    notFound: "The plan could not be found. It may have been removed, or not approved yet. Get in touch with the school.",
    depthQ: "How much do you want written out?",
    depthFull: "Everything",
    depthGuided: "The main points",
    depthBrief: "Just the outline",
    theLesson: "The lesson",
    fbGood: "Good",
    fbOk: "OK",
    fbBad: "Bad",
    fbOpen: "Give feedback",
    fbOpenSub: "Not part of the lesson \xB7 about 2 minutes",
    fbStarsQ: "How was the lesson overall?",
    fbStar1: "Poor",
    fbStar5: "Very good",
    getReady: "Get ready",
    readySheet: "Pupil sheet",
    readySheetHint: "Print it, or copy it onto the board.",
    readyBoard: "Write on the board",
    readyKit: "Gather",
    readyGoal: "The goal",
    readyDone: "Done \u2013 hide",
    readyShow: "Show again",
    readyAllDone: "Everything is ready. Time to start.",
    stepOf: "Step {i} of {n}",
    stepDone: "Done \u2013 next step",
    stepReopen: "Reopen",
    nextUp: "Next up:",
    lastStep: "Last step. Then: feedback.",
    stepNow: "Now",
    shortBtn: "Short on time?",
    shortOff: "Show full",
    shortNote: "Skip the steps marked \u201CCan skip\u201D and give only the standard tasks.",
    canSkip: "Can skip",
    fbSteps: "How did each step go?",
    fbSkipped: "Skipped",
    fbNotePh: "What should change? (optional)",
    fbJump: "Feedback \u2193",
    fbSavedS: "Saved",
    fbIntro: "Two minutes, entirely optional. What you write here makes the plan better for the next substitute.",
    ifWrong: "If something goes wrong",
    afterH: "After the lesson",
    recallWhy: "Builds on",
    modelWrite: "Write on the board",
    modelSay: "Say while you write",
    modelAns: "Answer",
    miscH: "Common wrong answers \u2014 and what to say",
    miscWhy: "Why they say it",
    miscSay: "Then say",
    whereH: "Where things are",
    railWhere: "You are here",
    teachBtn: "\u25B6 Start the lesson",
    teachHint: "One step at a time, full screen. Press this when you are in the classroom.",
    prepBtn: "\u2190 Full plan",
    projBtn: "Show to the class",
    nextPhase: "Next",
    prevPhase: "Back",
    phaseOf: "of",
    projHint: "Close",
    projDeck: "Show the whole lesson",
    projModel: "Worked example",
    projPart: "Part {i} of {n}",
    projEnd: "End of this part",
    projStop: "Stop here. Move on when the class is ready.",
    projNextPart: "Next part",
    projDone: "The lesson is over.",
    projStep: "Step",
    projTasks: "Tasks",
    projExit: "Before you go",
    projGoal: "What this lesson is for",
    projPrev: "\u2039 Back",
    projNext: "Next \u203A",
    tierQ: "Tasks:",
    tierSupport: "More support",
    tierStandard: "Standard",
    tierChallenge: "More challenge",
    tierHint: "Same goal, three levels. Switch at any time \u2014 pupils see no level on their sheet.",
    tKicker: "Your lesson while you were away",
    tSubSaid: "What the substitute said",
    tQuestion: "Was this right for your class?",
    tWhy: "You are the only person who can judge whether the content was correct. The coordinator cannot, and the substitute can only say whether it could be delivered.",
    tRight: "Yes, right",
    tMostly: "Mostly right",
    tWrong: "No",
    tNoteLbl: "What was wrong? (optional)",
    tNotePh: "e.g. \u201CWe had already covered this\u201D or \u201CThe answer to task 2 is wrong\u201D",
    tNoteHint: "Goes to the coordinator. A plan you say is wrong is taken out of the shared pool.",
    tThePlan: "The plan they were given",
    tThanks: "Thank you \u2014 your answer is saved.",
    covLeftLbl: "Stopped at",
    covTitle: "How far did you get?",
    covAll: "All of it",
    covPart: "Part of it",
    covNone: "Hardly any",
    leftLbl: "Note for the class teacher (optional)",
    leftOff: 'e.g. "Finished tasks 1\u20134, ran out of time"',
    leftHint: "Saved so the class teacher can read it.",
    forStudents: "Student sheet",
    print: "Print",
    copyText: "Copy text",
    close: "Close",
    copiedTxt: "Copied",
    studentSheet: "Student sheet (no answers)",
    first90: "The first ninety seconds",
    goal: "Goal:",
    board: "Write on the board before the lesson starts",
    need: "You need:",
    clock: "The lesson, on the clock",
    say: "Say",
    pupils: "Pupils:",
    expect: "Expected:",
    check: "Check question:",
    answer: "Answer:",
    tasks: "Tasks with answers",
    stuck: "Stuck",
    ahead: "Finished early",
    wrong: "If it goes wrong",
    exit: "Exit ticket",
    handover: "Handover to the class teacher",
    yes: "Yes",
    no: "Not as it is",
    whyTitle: "What was off? (optional)",
    thanks: "Thank you \u2014 your answer is saved.",
    saveFail: "Could not save: ",
    aExplain: "Explain another way",
    aExercise: "More practice on this",
    aEasier: "Easier",
    aHarder: "Harder",
    barLbl: "Minutes left to fill:",
    working: "Working on it\u2026",
    srcLibrary: "Simulated support \u2013 no AI model connected yet",
    srcCache: "Saved answer from before",
    srcStored: "Additional content \u2013 saved earlier in this plan",
    genNew: "Generate a new one",
    simBanner: "Simulated plan \u2013 no AI model is connected yet.",
    srcModel: "Generated during the lesson",
    srcFallback: "Written support (the model did not answer)",
    boardNow: "Write this on the board",
    tasksNow: "Tasks with answers",
    saved: "Saved to the plan \u2014 flagged for review.",
    quota: "The daily limit for in-lesson help has been reached for this plan.",
    onlyOther: "Only available in Swedish",
    whatHappened: "What happened? (optional, one line)",
    whatHappenedPh: "e.g. they got stuck on the denominator",
    noteSaved: "Thank you \u2014 saved with the plan.",
    pickCovFirst: "Pick how far you got first.",
    xvQ: "Did this help?",
    xvUp: "\u{1F44D} Yes",
    xvDown: "\u{1F44E} No",
    xvThanks: "Thanks! The next substitute benefits from your answer.",
    commentTitle: "What worked, what did not? (optional)",
    commentPh: "One line is enough. This is the part the class teacher and we get most out of.",
    send: "Send",
    reasons: {
      short: "Ran short",
      long: "Ran long",
      materials: "Materials did not work",
      unclear: "Instructions unclear"
    }
  };

  // app-src/deck.ts
  function already(S, txt) {
    if (!txt || !txt.trim()) return true;
    const t = txt.trim();
    return S.some(function(sl) {
      const hay = [sl.h, sl.pre].concat(sl.items || []).filter(Boolean).join("\n").trim();
      if (!hay) return false;
      if (hay.indexOf(t) !== -1) return true;
      if (sl.items && sl.items.length && t.indexOf(sl.items[0]) !== -1) return true;
      return hay.length > 8 && t.indexOf(hay) !== -1;
    });
  }
  function deckOf(p, l) {
    const S = [];
    const phases = p.phases || [];
    let cur = -1;
    const add = (sl) => {
      S.push({ ...sl, ph: cur, pn: phases.length });
    };
    const push = (sl) => {
      const txt = sl.pre || sl.h;
      if (sl.items || !already(S, txt)) add(sl);
    };
    if (p.title) add({ h: p.title, lead: p.goal || "" });
    phases.forEach(function(ph, i) {
      cur = i;
      if (i === 1 && p.model && p.model.p) {
        push({ step: l.projModel, h: p.model.p });
        (p.model.st || []).forEach(function(st, j) {
          if (st && st.b) add({ step: l.projStep + " " + (j + 1), pre: st.b });
        });
      }
      let core = [];
      if (i === 3) {
        core = (p.tasks || []).filter((x) => (x.tier || "core") === "core");
        if (!core.length) core = p.tasks || [];
      }
      for (let k = 0; k < core.length; k += 5) {
        add({ step: l.projTasks, items: core.slice(k, k + 5).map((x) => x.q) });
      }
      const starters = i === 0 ? (ph.checks || []).map((c) => c && c.q).filter(Boolean) : [];
      if (starters.length) add({ step: ph.n, items: starters });
      else if (ph.board) push({ step: ph.n, pre: ph.board });
    });
    if (p.exit && p.exit.q) {
      cur = Math.max(0, phases.length - 1);
      push({ step: l.projExit, h: p.exit.q });
    }
    phases.forEach(function(ph, i) {
      if (!S.some((sl) => sl.ph === i)) {
        let at = S.length;
        for (let k = 0; k < S.length; k++) {
          if (S[k].ph > i) {
            at = k;
            break;
          }
        }
        S.splice(at, 0, { step: ph.n, h: ph.n, ph: i, pn: phases.length });
      }
    });
    return S;
  }
  function deckScope(p, l, i) {
    const phases = p.phases || [];
    const out = deckOf(p, l).filter((sl) => sl.ph === i);
    const nx = phases[i + 1];
    out.push({ end: true, ph: i, pn: phases.length, nextPh: nx ? i + 1 : -1, nextName: nx ? nx.n : "" });
    return out;
  }
  function deckAll(p, l) {
    const phases = p.phases || [];
    const out = [];
    let last = -2;
    deckOf(p, l).forEach(function(sl) {
      if (sl.ph >= 0 && sl.ph !== last) {
        out.push({ divider: true, h: (phases[sl.ph] || {}).n || "", ph: sl.ph, pn: phases.length });
      }
      last = sl.ph;
      out.push(sl);
    });
    return out;
  }

  // app-src/plan.ts
  var sb = window.supabase.createClient(
    "https://pbamabzbfbkxajntsrmc.supabase.co",
    "sb_publishable_XtMg3eLikZtI-UkNspIwcA_bWGvj428"
  );
  var params = new URLSearchParams(location.search);
  var RUN_CODE = params.get("r");
  var token = params.get("t");
  var RUN = null;
  var KEYID = RUN_CODE ? "r_" + RUN_CODE : token;
  var DATA = null;
  var ASPECTS = { reuse: "", clarity: "", timefit: "" };
  var SESSION = (() => {
    if (RUN_CODE) return "r_" + RUN_CODE;
    const k = "lk.sess." + token;
    try {
      let v = localStorage.getItem(k);
      if (!v) {
        v = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(k, v);
      }
      return v;
    } catch {
      return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  })();
  var EXTRAS = [];
  var REASONS = /* @__PURE__ */ new Set();
  var PROG = (() => {
    const base = { ready: {}, done: {}, short: false, sec: {} };
    try {
      return Object.assign(base, JSON.parse(localStorage.getItem("lk.prog." + KEYID) || "{}"));
    } catch {
      return base;
    }
  })();
  var saveProg = () => {
    try {
      localStorage.setItem("lk.prog." + KEYID, JSON.stringify(PROG));
    } catch {
    }
  };
  var LANG = params.get("lang") || (() => {
    try {
      return localStorage.getItem("lk.lang") || "";
    } catch {
      return "";
    }
  })();
  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  var esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ESC[c] ?? c);
  function $(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error("missing #" + id);
    return el;
  }
  var maybe$ = (id) => document.getElementById(id);
  var L = () => LANG === "en" ? EN_LABELS : SV_LABELS;
  function renderTeacher(d) {
    const l = L();
    const all = { [d.language || "sv"]: d.body };
    if (d.body_alt && d.language_alt) all[d.language_alt] = d.body_alt;
    const p = all[LANG] || all[d.language || "sv"] || {};
    const said = d.substitute_said || [];
    const covText = { all: l.covAll, part: l.covPart, none: l.covNone };
    $("out").innerHTML = '<div class="card"><span class="kicker">' + esc(l.tKicker) + "</span><h1>" + esc(p.title || d.title) + '</h1><p class="muted">' + esc(d.group_name) + " \xB7 " + esc(new Date(d.used_on).toLocaleDateString(
      LANG === "sv" ? "sv-SE" : "en-GB",
      { weekday: "long", day: "numeric", month: "long" }
    )) + (d.substitute ? " \xB7 " + esc(d.substitute) : "") + "</p>" + (said.length ? '<div class="ps"><h3>' + esc(l.tSubSaid) + "</h3>" + said.map((x) => '<p style="margin:4px 0">' + (x.coverage ? "<b>" + esc(covText[x.coverage] || x.coverage) + ".</b> " : "") + (x.left_off ? esc(l.covLeftLbl) + ": " + esc(x.left_off) + ". " : "") + (x.comment ? esc(x.comment) : "") + "</p>").join("") + "</div>" : "") + '</div><div class="card ratebox noprint"><h3>' + esc(l.tQuestion) + '</h3><p class="muted" style="margin:0 0 10px">' + esc(l.tWhy) + '</p><div class="qpick" id="tverdict">' + [["right", l.tRight], ["mostly", l.tMostly], ["wrong", l.tWrong]].map((o) => '<button data-tv="' + o[0] + '"' + (d.teacher_verdict === o[0] ? ' class="on"' : "") + ">" + esc(o[1]) + "</button>").join("") + '</div><label for="tnote" style="display:block;font-size:13px;font-weight:600;margin:14px 0 5px">' + esc(l.tNoteLbl) + '</label><div class="noterow"><input id="tnote" type="text" maxlength="400" placeholder="' + esc(l.tNotePh) + '" value="' + esc(d.teacher_note || "") + '"><button data-tnote>' + esc(l.send) + '</button></div><p class="hint" style="margin:6px 0 0">' + esc(l.tNoteHint) + '</p><p id="tmsg" class="hint" style="margin-top:10px"></p></div><div class="card"><h3>' + esc(l.tThePlan) + "</h3><p>" + esc(p.summary || "") + '</p><p style="font-size:13px;color:var(--ink-soft)"><b>' + esc(l.goal) + "</b> " + esc(p.goal || "") + "</p>" + // Parenthesised deliberately: a bare ternary here takes the whole
    // concatenation above as its condition and throws the card away.
    ((p.tasks || []).length ? '<h4 style="margin-top:14px">' + esc(l.tasks) + '</h4><ol style="font-size:13.5px">' + (p.tasks || []).map((x) => "<li>" + esc(x.q) + '<br><span class="ans">' + esc(x.a) + "</span></li>").join("") + "</ol>" : "") + "</div>";
  }
  function safeUrl(u) {
    try {
      const url = new URL(String(u || ""));
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch {
      return null;
    }
  }
  function embedUrl(u) {
    const safe = safeUrl(u);
    if (!safe) return null;
    const url = new URL(safe);
    if (/^(docs|drive)\.google\.com$/.test(url.hostname)) {
      const m = url.pathname.match(/^\/(document|presentation|spreadsheets|file)\/d\/([^/]+)/);
      if (m) return "https://" + url.hostname + "/" + m[1] + "/d/" + m[2] + "/preview";
    }
    return safe;
  }
  function renderLinked(d) {
    const l = L();
    const link = safeUrl(d.url);
    const emb = link ? embedUrl(link) : null;
    const what = d.label || (d.url ? l.linkedFrom : l.linkedNote);
    const until = d.expires_at ? new Date(d.expires_at) : null;
    const untilLine = until && !d.expired ? '<p class="hint">' + esc(l.linkedUntil) + " " + esc(runDate(new Date(until.getTime() - 1e3).toISOString().slice(0, 10))) + "</p>" : "";
    $("out").innerHTML = '<div class="card"><span class="kicker">' + esc(l.linkedKicker) + "</span><h1>" + esc(what) + "</h1>" + untilLine + (d.expired ? '<div class="flag"><span>!</span><div><b>' + esc(l.linkedGoneH) + "</b> " + esc(l.linkedGoneB) + "</div></div>" : "") + // Typed instructions have no button to press, so they must not be told
    // to press one. The teacher's own words are never translated — they are
    // the teacher's, and a rough translation of a safety instruction is worse
    // than the original. The reader can still choose to translate it with the
    // browser (translate="yes" below), which is their call and shows them the
    // original underneath on hover; we never do it for them.
    (d.expired ? "" : '<p class="muted">' + esc(d.url ? l.linkedBody : l.noteBody) + "</p>") + (d.note ? '<div class="ps"><h3>' + esc(l.linkedNoteH) + '</h3><p translate="yes" style="white-space:pre-wrap">' + esc(d.note) + "</p></div>" : "") + (link ? '<p class="noprint"><a class="openbtn" href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(l.linkedOpen) + " \u2197</a></p>" + (emb ? '<details class="peek noprint"><summary>' + esc(l.linkedPeek) + '</summary><div class="embed"><iframe src="' + esc(emb) + '" title="' + esc(what) + '" loading="lazy"></iframe></div><p class="hint">' + esc(l.linkedFallback) + "</p></details>" : "") : "") + '</div><div class="card ratebox noprint"><h3>' + esc(l.covTitle) + '</h3><div class="covrow" id="covrow">' + ["all", "part", "none"].map((k) => '<button data-lcov="' + k + '">' + esc(l[{ all: "covAll", part: "covPart", none: "covNone" }[k]]) + "</button>").join("") + '</div><label for="leftoff" style="display:block;font-size:13px;font-weight:600;margin:12px 0 5px">' + esc(l.leftLbl) + '</label><div class="noterow"><input id="leftoff" type="text" maxlength="300" placeholder="' + esc(l.leftOff) + '"><button data-lleft>' + esc(l.send) + '</button></div><p class="hint" style="margin:6px 0 0">' + esc(l.leftHint) + '</p><p id="lratemsg" class="hint" style="margin-top:10px"></p><p class="hint" style="margin:10px 0 0">' + esc(l.linkedNoRate) + "</p></div>";
  }
  function runDate(d) {
    return (/* @__PURE__ */ new Date(d + "T12:00:00")).toLocaleDateString(
      LANG === "sv" ? "sv-SE" : "en-GB",
      { weekday: "short", day: "numeric", month: "short" }
    );
  }
  function shiftT(tt, sh) {
    if (!sh || !tt) return tt;
    return String(tt).replace(/(\d{1,2}):(\d{2})/g, (_m, h, mi) => {
      const v = ((+h * 60 + +mi + sh) % 1440 + 1440) % 1440;
      return ("0" + Math.floor(v / 60)).slice(-2) + ":" + ("0" + v % 60).slice(-2);
    });
  }
  function clockShift(p) {
    const m = RUN && RUN.lesson_time && String(RUN.lesson_time).match(/(\d{1,2}):(\d{2})/);
    const f = p && (p.phases || [])[0] && String(p.phases[0].t || "").match(/(\d{1,2}):(\d{2})/);
    if (!m || !f) return 0;
    return +m[1] * 60 + +m[2] - (+f[1] * 60 + +f[2]);
  }
  function runBand() {
    if (!RUN) return "";
    const l = L();
    const until = RUN.expires_at ? new Date(RUN.expires_at) : null;
    return '<div class="runband"><b>' + esc(RUN.group_name) + "</b>" + (RUN.lesson_time ? " \xB7 " + esc(RUN.lesson_time) : "") + " \xB7 " + esc(runDate(RUN.used_on)) + (RUN.substitute ? " \xB7 " + esc(RUN.substitute) : "") + (until ? '<span class="until">' + esc(l.runUntil) + " " + esc(runDate(new Date(until.getTime() - 1e3).toISOString().slice(0, 10))) + "</span>" : "") + "</div>";
  }
  async function load() {
    if (RUN_CODE) {
      const rr = await sb.rpc("lk_run_by_token", { p_run: RUN_CODE });
      RUN = rr.data;
      if (!RUN) {
        $("out").innerHTML = '<p class="muted">' + esc(L().notFound) + "</p>";
        return;
      }
      if (RUN.expired || !RUN.plan_token) {
        $("out").innerHTML = '<div class="full"><div class="offl">' + esc(L().runExpiredH) + '</div><p class="muted">' + esc(L().runExpiredB.replace("{g}", RUN.group_name).replace("{d}", runDate(RUN.used_on))) + "</p></div>";
        return;
      }
      token = RUN.plan_token;
    }
    if (!token) {
      $("out").innerHTML = '<p class="muted">' + esc(L().noCode) + "</p>";
      return;
    }
    if (params.get("as") === "teacher") {
      const tv = await sb.rpc("lk_teacher_view", { p_token: token });
      if (tv.data) {
        renderTeacher(tv.data);
        return;
      }
    }
    const linked = await sb.rpc("lk_linked_by_token", { p_token: token });
    if (linked.data) {
      renderLinked(linked.data);
      return;
    }
    const [plan, extras] = await Promise.all([
      sb.rpc("lk_plan_by_token", { p_token: token }),
      sb.rpc("lk_extras_by_token", { p_token: token })
    ]);
    const ck = "lk.plan." + token;
    if (plan.error && !plan.data) {
      try {
        const c = JSON.parse(localStorage.getItem(ck) || "null");
        if (c && c.plan) {
          OFFLINE = true;
          EXTRAS = c.extras || [];
          render(c.plan);
          return;
        }
      } catch {
      }
    }
    if (plan.error || !plan.data) {
      $("out").innerHTML = '<p class="muted">' + esc(L().notFound) + "</p>";
      return;
    }
    EXTRAS = Array.isArray(extras.data) ? extras.data : [];
    try {
      localStorage.setItem(ck, JSON.stringify({ plan: plan.data, extras: EXTRAS }));
    } catch {
    }
    render(plan.data);
  }
  function bodies(d) {
    const b = {};
    b[d.language || "sv"] = d.body;
    if (d.body_alt && d.language_alt) b[d.language_alt] = d.body_alt;
    return b;
  }
  function assistRow(ref, label) {
    const l = L(), a = (k, v, txt) => '<button data-assist="' + k + '" data-ref="' + esc(ref) + '"' + (v ? ' data-variant="' + v + '"' : "") + ' data-label="' + esc(label) + '">' + esc(txt) + "</button>";
    return '<div class="assist noprint">' + a("explain", "", l.aExplain) + a("exercise", "", l.aExercise) + a("level", "easier", l.aEasier) + a("level", "harder", l.aHarder) + "</div>";
  }
  function extraBody(x) {
    if (x.language === LANG) return { body: x.body, exact: true };
    if (x.language_alt === LANG && x.body_alt) return { body: x.body_alt, exact: true };
    return { body: x.body, exact: false, lang: x.language };
  }
  var extraHasContent = (b) => b && (b.title || (b.lines || []).length || b.board || (b.tasks || []).length);
  function storedFor(opts) {
    if (opts.kind === "filler") return null;
    const hit = EXTRAS.filter((x) => x.section_ref === opts.ref && x.kind === opts.kind && (x.variant || "") === (opts.variant || "") && x.kept !== false).filter((x) => {
      const b = extraBody(x);
      return b.exact && extraHasContent(b.body);
    });
    return hit.length ? hit[hit.length - 1] : null;
  }
  function sheetHtml(extra, source, saveNote, extraId, opts) {
    const l = L();
    const srcTxt = source === "stored" ? l.srcStored : source === "model" ? l.srcModel : source === "cache" ? l.srcCache : source === "fallback" ? l.srcFallback : l.srcLibrary;
    let h = "<h3>" + esc(extra.title) + '</h3><div class="src">' + esc(srcTxt) + (extra.minutes ? " \xB7 " + extra.minutes + " min" : "") + "</div>";
    h += "<ol>" + (extra.lines || []).map((x) => "<li>" + esc(x) + "</li>").join("") + "</ol>";
    if (extra.board) h += '<h4 style="font-size:13px;margin-bottom:5px">' + esc(l.boardNow) + '</h4><div class="board">' + esc(extra.board) + "</div>";
    if ((extra.tasks || []).length) {
      h += '<h4 style="font-size:13px;margin:14px 0 5px">' + esc(l.tasksNow) + '</h4><ol style="font-size:13.5px">' + extra.tasks.map((x) => "<li>" + esc(x.q) + ' <span class="ans">' + esc(x.a) + "</span></li>").join("") + "</ol>";
    }
    h += '<div class="sheetfoot"><span class="hint">' + esc(saveNote) + "</span></div>";
    if (extraId) {
      h += '<div class="xverdict"><span>' + esc(l.xvQ) + '</span><button data-xv="' + extraId + ':1">' + esc(l.xvUp) + '</button><button data-xv="' + extraId + ':0">' + esc(l.xvDown) + '</button><span class="hint" id="xvmsg"></span></div>';
      h += '<div class="note"><label for="noteq">' + esc(l.whatHappened) + '</label><div class="noterow"><input id="noteq" type="text" maxlength="240" placeholder="' + esc(l.whatHappenedPh) + '"><button data-note="' + extraId + '" data-noteref="' + esc(opts?.ref || "") + '">' + esc(l.send) + '</button></div><p id="notemsg" class="hint" style="margin:7px 0 0"></p></div>';
    }
    return h;
  }
  var LASTASSIST = null;
  async function runAssist(opts) {
    const l = L();
    LASTASSIST = opts;
    $("sheet").hidden = false;
    const have = opts.fresh ? null : storedFor(opts);
    if (have) {
      $("sheetbody").innerHTML = sheetHtml(extraBody(have).body || {}, "stored", "", have.id, opts) + '<div class="strow noprint"><button class="stbtn" data-assistnew="1">' + esc(l.genNew) + '</button><button class="stbtn" data-student="x:' + have.id + '">' + esc(l.forStudents) + "</button></div>";
      return;
    }
    $("sheetbody").innerHTML = '<h3><span class="spin"></span> ' + esc(l.working) + "</h3>";
    if (!DATA) return;
    const p = currentBody();
    const payload = {
      kind: opts.kind,
      section_ref: opts.ref,
      section_label: opts.label,
      section_text: opts.text || "",
      variant: opts.variant || "",
      language: LANG,
      subject: DATA.subject,
      year_group: DATA.year_group,
      topic: p?.title || DATA.title,
      minutes_left: opts.minutes || void 0,
      fresh: opts.fresh || void 0
    };
    const q = await sb.rpc("lk_assist_quota", { p_token: token });
    if (typeof q.data === "number" && q.data <= 0) {
      $("sheetbody").innerHTML = "<h3>" + esc(l.quota) + "</h3>";
      return;
    }
    const { data, error } = await sb.functions.invoke("lk-assist", { body: payload });
    if (error || !data?.extra) {
      $("sheetbody").innerHTML = "<h3>" + esc(l.saveFail) + '</h3><p class="muted">' + esc(error?.message || "unknown") + "</p>";
      return;
    }
    const saved = await sb.rpc("lk_assist_save", {
      p_token: token,
      p_section_ref: opts.ref,
      p_section_label: opts.label || null,
      p_kind: opts.kind,
      p_variant: opts.variant || null,
      p_language: data.language || LANG,
      p_body: data.extra,
      p_model: data.model || null,
      p_body_alt: data.extra_alt || null,
      p_language_alt: data.extra_alt ? data.language_alt : null
    });
    const ok = saved.data?.ok;
    const note = ok ? l.saved : saved.data?.error === "quota" ? l.quota : "";
    $("sheetbody").innerHTML = sheetHtml(data.extra, data.source, note, ok ? saved.data.id : null, opts);
    if (ok) {
      EXTRAS.push({
        id: saved.data.id,
        section_ref: opts.ref || "",
        section_label: opts.label,
        kind: opts.kind,
        variant: opts.variant,
        language: data.language || LANG,
        body: data.extra,
        language_alt: data.extra_alt ? data.language_alt : null,
        body_alt: data.extra_alt || null
      });
      render(DATA, true);
    }
  }
  function currentBody() {
    if (!DATA) return null;
    const all = bodies(DATA);
    return all[LANG] || all[DATA.language || "sv"] || null;
  }
  function render(d, keepScroll) {
    const y = keepScroll ? window.scrollY : 0;
    DATA = d;
    const all = bodies(d);
    if (!all[LANG]) LANG = d.language || Object.keys(all)[0];
    const p = all[LANG] || {};
    const choices = Object.keys(all);
    const l = L();
    if (QUICK) {
      let q = '<div class="qmode"><div class="subhead"><div class="subhead-row"><div><h1>' + esc(l.quickTitle) + " \u2014 " + esc(p.title) + '</h1><div class="m">' + esc(l.quickHint) + '</div></div></div></div><div class="strow noprint"><button class="stbtn" data-quick="0">' + esc(l.fullBtn) + '</button></div><div class="flag" style="background:#f0f5fb;color:#14407a"><span>\u2460</span><div><b>' + esc(l.first90) + '</b><ul style="margin:6px 0 0;padding-left:18px">' + (p.first90 || []).map((x) => "<li>" + esc(x) + "</li>").join("") + '</ul></div></div><div class="ps"><h4>' + esc(l.board) + '</h4><div class="board">' + esc(p.board) + '</div><p style="margin-top:8px;font-size:13px"><b>' + esc(l.need) + "</b> " + esc(p.equipment?.need) + '</p></div><div class="ps"><h4>' + esc(l.clock) + "</h4>" + (p.phases || []).map((ph) => '<p style="margin:4px 0;font-size:14px"><span class="clock">' + esc(shiftT(ph.t, clockShift(p))) + "</span> <strong>" + esc(ph.n) + "</strong></p>").join("") + '</div><div class="strow noprint"><button class="stbtn" data-student="lesson">' + esc(l.studentSheet) + "</button></div></div>";
      $("out").innerHTML = q;
      $("bar").hidden = true;
      if (keepScroll) window.scrollTo(0, y);
      return;
    }
    const phases = p.phases || [];
    const hooks = {
      lbl: (k) => l[k] ?? "",
      depth: DEPTH,
      assistRow: (ref, name) => assistRow(ref, name),
      projector: true,
      shiftMin: clockShift(p),
      help: false,
      // lifted into the margin rail below
      interactive: true,
      ready: PROG.ready,
      done: PROG.done,
      short: PROG.short
    };
    if (TEACH) {
      const i = Math.max(0, Math.min(TPHASE, phases.length - 1));
      const one = window.LKPlan.render(p, Object.assign(
        {},
        hooks,
        // done:{} so a finished step still shows when you go Back to it; in this
        // view "Done" moves on instead of folding the only thing on screen.
        { only: i, done: {}, assistRow: () => "", extras: () => "" }
      ));
      $("out").innerHTML = '<div class="teachview"><div class="tv">' + one + '</div><div class="tvbar"><button data-teach="0">' + esc(l.prepBtn) + "</button><button data-projdeck>" + esc(l.projDeck) + '</button><div class="tvdots">' + phases.map((_, j) => '<i class="' + (j === i ? "on" : "") + '"></i>').join("") + '</div><span class="pos">' + (i + 1) + " " + esc(l.phaseOf) + " " + phases.length + '</span><span class="sp"></span><button data-tph="' + (i - 1) + '"' + (i === 0 ? " disabled" : "") + ">" + esc(l.prevPhase) + '</button><button class="pri" data-tph="' + (i + 1) + '"' + (i >= phases.length - 1 ? " disabled" : "") + ">" + esc(l.nextPhase) + "</button></div></div>";
      document.body.classList.add("teach");
      $("bar").hidden = true;
      return;
    }
    document.body.classList.remove("teach");
    let h = '<div class="full">' + (d.model === "canned" ? '<div class="offl noprint">' + esc(l.simBanner) + "</div>" : "") + (OFFLINE ? '<div class="offl noprint">' + esc(l.offlineNote) + "</div>" : "") + '<div class="subhead">' + runBand() + '<div class="subhead-row"><div><h1>' + esc(p.title) + '</h1><div class="m">' + esc(d.subject) + " \xB7 " + esc(d.year_group) + " \xB7 " + d.minutes + " min \xB7 " + esc(d.school) + "</div></div>" + (choices.length > 1 ? '<div class="langpick noprint">' + choices.map((c) => '<button data-pick="' + c + '"' + (c === LANG ? ' class="on"' : "") + ">" + (c === "sv" ? "SV" : "EN") + "</button>").join("") + "</div>" : "") + '</div><div class="startrow noprint"><button class="startbtn" data-teach="1">' + esc(l.teachBtn) + '</button><span class="starthint">' + esc(l.teachHint) + '</span></div></div><div class="strow noprint"><button class="stbtn" data-quick="1">' + esc(l.quickBtn) + '</button><button class="stbtn" data-student="lesson">' + esc(l.studentSheet) + '</button><button class="stbtn" data-pack>' + esc(l.packBtn) + '</button></div><div class="depthrow noprint"><span class="dl">' + esc(l.depthQ) + "</span>" + [["full", l.depthFull], ["guided", l.depthGuided], ["brief", l.depthBrief]].map((x) => '<button data-depth="' + x[0] + '"' + (DEPTH === x[0] ? ' class="on"' : "") + ">" + esc(x[1]) + "</button>").join("") + "</div></div>";
    h += '<aside class="rail rail-l noprint"><div class="rail-in"><div class="nav"><h4>' + esc(l.railWhere) + "</h4>" + phases.map((ph, i) => '<a href="#ph' + i + '" class="' + window.LKPlan.kind(i) + '">' + esc(ph.n) + '<span class="t">' + esc(shiftT(ph.t, clockShift(p))) + "</span></a>").join("") + "</div></aside>";
    h += '<main class="col">' + window.LKPlan.render(p, hooks) + "</main>";
    h += '<aside class="rail rail-r"><div class="rail-in">' + window.LKPlan.help(p, hooks.lbl) + "</div></aside>";
    h += '<hr class="after-rule noprint"><div class="full">' + window.LKPlan.after(p, hooks.lbl) + "</div>";
    h += '<div class="full"><div class="onlyprint"><div id="studentprint" class="stprint">' + studentParts("lesson").html + "</div></div>";
    const SECV = [["good", l.fbGood], ["ok", l.fbOk], ["bad", l.fbBad]];
    const STARS = Number(PROG.stars || 0);
    h += '<section class="fbpanel noprint" id="feedback"><button class="fb-open" data-fbtoggle aria-expanded="' + (PROG.fbopen ? "true" : "false") + '"><span><b>' + esc(l.fbOpen) + "</b><small>" + esc(l.fbOpenSub) + '</small></span><i class="fb-caret">&#9662;</i></button><div class="fb-body"' + (PROG.fbopen ? "" : " hidden") + '><p class="fb-intro">' + esc(l.fbIntro) + "</p><h4>" + esc(l.fbSteps) + "</h4>" + phases.map((ph, i) => {
      const ref = "phase:" + i, cur = PROG.sec[ref] || {};
      return '<div class="fb-row" data-fbrow="' + ref + '"><div class="fb-top"><div class="fb-lbl"><span class="fb-n">' + (i + 1) + "</span>" + esc(ph.n) + '</div><div class="fb-pick">' + SECV.map((o) => '<button data-sec="' + ref + "|" + o[0] + '" class="fb-' + o[0] + (cur.v === o[0] ? " on" : "") + '">' + esc(o[1]) + "</button>").join("") + '<button data-sec="' + ref + '|skipped" class="fb-skipped' + (cur.v === "skipped" ? " on" : "") + '">' + esc(l.fbSkipped) + '</button></div></div><div class="fb-note"' + (cur.v === "ok" || cur.v === "bad" ? "" : " hidden") + '><input type="text" maxlength="300" placeholder="' + esc(l.fbNotePh) + '" value="' + esc(cur.note || "") + '" data-secnote-in="' + ref + '"><button data-secnote="' + ref + '">' + esc(l.send) + "</button></div></div>";
    }).join("") + "<h4>" + esc(l.fbStarsQ) + '</h4><div class="fb-stars" id="fbstars" role="radiogroup"><span class="fb-sl">' + esc(l.fbStar1) + "</span>" + [1, 2, 3, 4, 5].map((n) => '<button data-star="' + n + '" class="' + (n <= STARS ? "on" : "") + '" aria-label="' + n + '">&#9733;</button>').join("") + '<span class="fb-sl">' + esc(l.fbStar5) + "</span></div>" + [["reuse", l.qReuse, [["yes", l.aReuseYes], ["changes", l.aReuseChanges], ["no", l.aReuseNo]]]].map(function(q) {
      return '<div class="qrow"><p class="ql">' + esc(q[1]) + '</p><div class="qpick" id="q-' + q[0] + '">' + q[2].map(function(o) {
        return '<button data-asp="' + q[0] + ":" + o[0] + '"' + (ASPECTS[q[0]] === o[0] ? ' class="on"' : "") + ">" + esc(o[1]) + "</button>";
      }).join("") + "</div></div>";
    }).join("") + "<h4>" + esc(l.covTitle) + '</h4><div class="covrow" id="covrow">' + ["all", "part", "none"].map((k) => '<button data-cov="' + k + '"' + (COV === k ? ' class="on"' : "") + ">" + esc(l[{ all: "covAll", part: "covPart", none: "covNone" }[k]]) + "</button>").join("") + '</div><label for="leftoff" style="display:block;font-size:13px;font-weight:600;margin:12px 0 5px">' + esc(l.leftLbl) + '</label><div class="noterow"><input id="leftoff" type="text" maxlength="300" placeholder="' + esc(l.leftOff) + '" value="' + esc(LEFT) + '"><button data-leftoff>' + esc(l.send) + '</button></div><p class="hint" style="margin:6px 0 0">' + esc(l.leftHint) + '</p><div id="why"' + (ASPECTS.reuse && ASPECTS.reuse !== "yes" ? "" : " hidden") + '><p class="hint" style="margin:14px 0 0">' + esc(l.whyTitle) + '</p><div class="reasons">' + Object.keys(l.reasons).map((k) => '<button data-reason="' + k + '"' + (REASONS.has(k) ? ' class="on"' : "") + ">" + esc(l.reasons[k]) + "</button>").join("") + '</div></div><div id="saybox"' + (ASPECTS.reuse ? "" : " hidden") + ' class="note" style="margin-top:14px"><label for="say">' + esc(l.commentTitle) + '</label><div class="noterow"><input id="say" type="text" maxlength="400" placeholder="' + esc(l.commentPh) + '" value="' + esc(SAY) + '"><button data-comment>' + esc(l.send) + '</button></div></div><p id="ratemsg" class="hint" style="margin-top:10px"></p></div></section>';
    $("out").innerHTML = h;
    $("barlbl").textContent = l.barLbl;
    $("fbjump").textContent = l.fbJump;
    $("bar").hidden = false;
    if (keepScroll) window.scrollTo(0, y);
  }
  var STUDENT_TXT = "";
  var QUICK = false;
  var OFFLINE = false;
  var COV = "";
  var LEFT = "";
  var SAY = "";
  var TEACH = false;
  var TPHASE = 0;
  var DEPTH = (() => {
    try {
      return localStorage.getItem("lk.depth") || "full";
    } catch {
      return "full";
    }
  })();
  var STIER = "core";
  function studentParts(which) {
    const l = L();
    const p = DATA && bodies(DATA)[LANG] || {};
    let title, board, tasks, mats = [], exit = "";
    if (which === "lesson") {
      title = p.title;
      board = p.board;
      tasks = (p.tasks || []).filter((x) => (x.tier || "core") === STIER).map((x) => x.q);
      mats = p.materials || [];
      exit = p.exit?.q || "";
    } else {
      const x = EXTRAS.find((e) => String(e.id) === which.slice(2));
      const { body } = extraBody(x || {});
      title = body?.title;
      board = body?.board;
      tasks = (body?.tasks || []).map((q) => q.q);
    }
    const txt = [title, "", board, ""].concat(mats.map((m) => m.h + "\n" + m.body + "\n")).concat(tasks.map((q, i) => i + 1 + ". " + q)).concat(exit ? ["", l.exit + ": " + exit] : []).join("\n").trim();
    let h = "<h1>" + esc(title || "") + "</h1>";
    if (board) h += '<div class="bigboard">' + esc(board) + "</div>";
    mats.forEach((m) => {
      h += "<h2>" + esc(m.h) + '</h2><div class="mat">' + esc(m.body) + "</div>";
    });
    if (tasks.length) h += "<h2>" + esc(l.tasksNow.replace(/ med facit| with answers/i, "")) + "</h2><ol>" + tasks.map((q) => "<li>" + esc(q) + "</li>").join("") + "</ol>";
    if (exit) h += "<h2>" + esc(l.exit) + '</h2><p style="font-size:19px">' + esc(exit) + "</p>";
    return { html: h, txt };
  }
  function openStudent(which) {
    const l = L();
    const { html, txt } = studentParts(which);
    STUDENT_TXT = txt;
    const p = DATA && bodies(DATA)[LANG] || {};
    const has = (k) => (p.tasks || []).some((x) => (x.tier || "core") === k);
    const picker = which !== "lesson" || !(has("support") || has("extension")) ? "" : '<span class="stier">' + esc(l.tierQ) + "</span>" + [["support", l.tierSupport], ["core", l.tierStandard], ["extension", l.tierChallenge]].filter((x) => has(x[0])).map((x) => '<button class="stbtn' + (STIER === x[0] ? " on" : "") + '" data-stier="' + x[0] + '">' + esc(x[1]) + "</button>").join("");
    const h = '<div class="in"><div class="stbar noprint">' + picker + '<span class="stsp"></span><button class="stbtn" data-stprint>' + esc(l.print) + '</button><button class="stbtn" data-stcopy>' + esc(l.copyText) + '</button><button class="stbtn" data-stclose>' + esc(l.close) + "</button></div>" + html + "</div>";
    let el = document.getElementById("student");
    if (!el) {
      el = document.createElement("div");
      el.id = "student";
      document.body.appendChild(el);
    }
    el.innerHTML = h;
    el.hidden = false;
    el.scrollTop = 0;
    document.body.classList.add("pst");
  }
  function closeStudent() {
    const el = document.getElementById("student");
    if (el) el.hidden = true;
    document.body.classList.remove("pst");
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const sheet = maybe$("sheet");
      if (sheet && !sheet.hidden) {
        sheet.hidden = true;
        return;
      }
      const st = document.getElementById("student");
      if (st && !st.hidden) {
        closeStudent();
        return;
      }
      const b = document.querySelector(".proj");
      if (b) {
        b.remove();
        DECK = null;
        return;
      }
      if (TEACH && DATA) {
        const out = document.querySelector('[data-teach="0"]');
        if (out) out.click();
        else {
          TEACH = false;
          render(DATA);
        }
        return;
      }
    }
    if (document.querySelector(".proj") && DECK) {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        DI++;
        paintSlide();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        DI--;
        paintSlide();
        return;
      }
      return;
    }
    if (!TEACH || !DATA) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      const last = Math.max(0, ((bodies(DATA)[LANG] || {}).phases || []).length - 1);
      if (TPHASE < last) {
        TPHASE++;
        render(DATA);
        window.scrollTo(0, 0);
      }
    }
    if (e.key === "ArrowLeft" || e.key === "PageUp") {
      TPHASE = Math.max(0, TPHASE - 1);
      render(DATA);
      window.scrollTo(0, 0);
    }
  });
  var DECK = null;
  var DI = 0;
  function slideHtml(sl, i, n, l) {
    const part = sl.ph >= 0 && sl.pn ? '<span class="ttl">' + esc(l.projPart.replace("{i}", String(sl.ph + 1)).replace("{n}", String(sl.pn))) + "</span>" : "";
    let body;
    if (sl.end) {
      body = '<div class="slide endcard"><span class="step">' + esc(l.projEnd) + "</span><h2>" + esc((sl.nextPh ?? -1) >= 0 ? l.projStop : l.projDone) + "</h2>" + ((sl.nextPh ?? -1) >= 0 ? '<button class="nextpart" data-projpart="' + sl.nextPh + '">' + esc(l.projNextPart) + ": " + esc(sl.nextName) + " \u203A</button>" : "") + "</div>";
    } else if (sl.divider) {
      body = '<div class="slide divider"><span class="step">' + esc(l.projPart.replace("{i}", String(sl.ph + 1)).replace("{n}", String(sl.pn))) + "</span><h2>" + esc(sl.h) + "</h2></div>";
    } else {
      body = '<div class="slide">' + (sl.step ? '<span class="step">' + esc(sl.step) + "</span>" : "") + (sl.h ? "<h2>" + esc(sl.h) + "</h2>" : "") + (sl.lead ? '<p class="lead">' + esc(l.projGoal) + ": " + esc(sl.lead) + "</p>" : "") + (sl.pre ? "<pre>" + esc(sl.pre) + "</pre>" : "") + (sl.items ? "<ol>" + sl.items.map((q) => "<li>" + esc(q) + "</li>").join("") + "</ol>" : "") + "</div>";
    }
    const shown = (DECK || []).filter((x) => !x.end).length;
    return part + body + (sl.end ? "" : '<span class="count">' + (i + 1) + " / " + shown + "</span>") + '<button class="cl" data-projclose>' + esc(l.projHint) + '</button><div class="pnav"><button data-projgo="-1"' + (i === 0 ? " disabled" : "") + ">" + esc(l.projPrev) + '</button><button data-projgo="1"' + (i === n - 1 ? " disabled" : "") + ">" + esc(l.projNext) + "</button></div>";
  }
  function paintSlide() {
    const box = document.querySelector(".proj");
    if (!box || !DECK || !DECK.length) return;
    DI = Math.max(0, Math.min(DI, DECK.length - 1));
    box.innerHTML = slideHtml(DECK[DI], DI, DECK.length, L());
  }
  function openDeck(scope) {
    if (!DATA) return;
    const all = bodies(DATA);
    const pp = all[LANG] || {};
    DECK = scope === "all" ? deckAll(pp, L()) : deckScope(pp, L(), scope);
    if (!DECK.length) return;
    DI = 0;
    const old = document.querySelector(".proj");
    if (old) old.remove();
    const box = document.createElement("div");
    box.className = "proj";
    document.body.appendChild(box);
    paintSlide();
  }
  document.addEventListener("click", async (e) => {
    const l = L();
    const tg = e.target;
    const sti = tg.closest("[data-stier]");
    if (sti) {
      STIER = sti.getAttribute("data-stier");
      openStudent("lesson");
      return;
    }
    const st = tg.closest("[data-student],[data-stprint],[data-stcopy],[data-stclose]");
    if (st) {
      if (st.hasAttribute("data-student")) return openStudent(st.getAttribute("data-student"));
      if (st.hasAttribute("data-stclose")) return closeStudent();
      if (st.hasAttribute("data-stprint")) return window.print();
      try {
        await navigator.clipboard.writeText(STUDENT_TXT);
        st.textContent = l.copiedTxt;
        setTimeout(() => {
          st.textContent = l.copyText;
        }, 1600);
      } catch {
      }
      return;
    }
    const rd = tg.closest("[data-ready]");
    if (rd && DATA) {
      const k = rd.getAttribute("data-ready");
      PROG.ready[k] = !PROG.ready[k];
      saveProg();
      render(DATA, true);
      return;
    }
    const sd = tg.closest("[data-stepdone]");
    if (sd && DATA) {
      const i = Number(sd.getAttribute("data-stepdone"));
      PROG.done[i] = true;
      saveProg();
      if (TEACH) {
        const cur = bodies(DATA)[LANG];
        const last = cur ? (cur.phases || []).length - 1 : i;
        if (i < last) {
          TPHASE = i + 1;
          render(DATA);
          window.scrollTo(0, 0);
          return;
        }
        TEACH = false;
        PROG.fbopen = true;
        saveProg();
        render(DATA);
        const fb = maybe$("feedback");
        if (fb) fb.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      render(DATA, true);
      const nx = document.querySelector(".ph-cur") || maybe$("feedback");
      if (nx) nx.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const sr = tg.closest("[data-stepre]");
    if (sr && DATA) {
      delete PROG.done[Number(sr.getAttribute("data-stepre"))];
      saveProg();
      render(DATA, true);
      return;
    }
    if (tg.closest("[data-short]") && DATA) {
      PROG.short = !PROG.short;
      saveProg();
      render(DATA, true);
      return;
    }
    if (tg.closest("[data-fbjump]")) {
      PROG.fbopen = true;
      const bd = document.querySelector("#feedback .fb-body");
      if (bd) bd.hidden = false;
      const tg2 = document.querySelector("#feedback [data-fbtoggle]");
      if (tg2) tg2.setAttribute("aria-expanded", "true");
      const f = maybe$("feedback");
      if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const sb1 = tg.closest("[data-sec]");
    if (sb1) {
      const [ref = "", verdict = ""] = sb1.getAttribute("data-sec").split("|");
      const idx = Number(ref.split(":")[1]);
      const label = ((DATA && bodies(DATA)[LANG] || {}).phases || [])[idx]?.n || ref;
      PROG.sec[ref] = Object.assign({}, PROG.sec[ref], { v: verdict });
      saveProg();
      const row = sb1.closest("[data-fbrow]");
      [...row.querySelectorAll("[data-sec]")].forEach((b) => b.classList.toggle("on", b === sb1));
      row.querySelector(".fb-note").hidden = !(verdict === "ok" || verdict === "bad");
      const { error } = await sb.rpc("lk_rate_section_by_token", {
        p_token: token,
        p_session: SESSION,
        p_ref: ref,
        p_label: label,
        p_verdict: verdict,
        p_note: null
      });
      $("ratemsg").textContent = error ? l.saveFail + error.message : "";
      return;
    }
    const stb = tg.closest("[data-star]");
    if (stb) {
      const n = Number(stb.getAttribute("data-star"));
      PROG.stars = n;
      saveProg();
      [...document.querySelectorAll("#fbstars [data-star]")].forEach((b) => b.classList.toggle("on", Number(b.getAttribute("data-star")) <= n));
      const { error } = await sb.rpc("lk_rate_stars_by_token", { p_token: token, p_session: SESSION, p_stars: n });
      $("ratemsg").textContent = error ? l.saveFail + error.message : l.thanks;
      return;
    }
    const ftg = tg.closest("[data-fbtoggle]");
    if (ftg) {
      PROG.fbopen = !PROG.fbopen;
      ftg.setAttribute("aria-expanded", PROG.fbopen ? "true" : "false");
      const bd = document.querySelector("#feedback .fb-body");
      if (bd) bd.hidden = !PROG.fbopen;
      return;
    }
    const sn = tg.closest("[data-secnote]");
    if (sn) {
      const ref = sn.getAttribute("data-secnote");
      const inp = document.querySelector('[data-secnote-in="' + ref + '"]');
      const val = (inp?.value || "").trim();
      if (!val) return;
      const idx = Number(ref.split(":")[1]);
      const label = ((DATA && bodies(DATA)[LANG] || {}).phases || [])[idx]?.n || ref;
      PROG.sec[ref] = Object.assign({}, PROG.sec[ref], { note: val });
      saveProg();
      const { error } = await sb.rpc("lk_rate_section_by_token", {
        p_token: token,
        p_session: SESSION,
        p_ref: ref,
        p_label: label,
        p_verdict: PROG.sec[ref].v || "ok",
        p_note: val
      });
      sn.textContent = error ? "!" : l.fbSavedS;
      return;
    }
    const qk = tg.closest("[data-quick]");
    if (qk && DATA) {
      QUICK = qk.getAttribute("data-quick") === "1";
      render(DATA);
      window.scrollTo(0, 0);
      return;
    }
    const tm = tg.closest("[data-teach]");
    if (tm && DATA) {
      TEACH = tm.getAttribute("data-teach") === "1";
      if (TEACH) TPHASE = 0;
      render(DATA);
      window.scrollTo(0, 0);
      return;
    }
    const tp = tg.closest("[data-tph]");
    if (tp && DATA) {
      TPHASE = parseInt(tp.getAttribute("data-tph"), 10) || 0;
      render(DATA);
      window.scrollTo(0, 0);
      return;
    }
    const pj = tg.closest("[data-proj]");
    if (pj && DATA) {
      openDeck(parseInt(pj.getAttribute("data-proj"), 10) || 0);
      return;
    }
    const pnx = tg.closest("[data-projpart]");
    if (pnx && DATA) {
      openDeck(parseInt(pnx.getAttribute("data-projpart"), 10) || 0);
      return;
    }
    if (tg.closest("[data-projdeck]") && DATA) {
      openDeck("all");
      return;
    }
    const pg = tg.closest("[data-projgo]");
    if (pg) {
      DI += parseInt(pg.getAttribute("data-projgo"), 10);
      paintSlide();
      return;
    }
    if (tg.closest("[data-projclose]")) {
      const b = document.querySelector(".proj");
      if (b) b.remove();
      const cs = DECK && DECK[DI];
      DECK = null;
      if (cs && typeof cs.ph === "number" && cs.ph >= 0 && DATA) {
        if (TEACH) {
          TPHASE = cs.ph;
          render(DATA);
          window.scrollTo(0, 0);
        } else {
          const t = document.getElementById("ph" + cs.ph);
          if (t) t.scrollIntoView({ block: "start" });
        }
      }
      return;
    }
    const dp = tg.closest("[data-depth]");
    if (dp && DATA) {
      DEPTH = dp.getAttribute("data-depth");
      try {
        localStorage.setItem("lk.depth", DEPTH);
      } catch {
      }
      render(DATA, true);
      return;
    }
    if (tg.closest("[data-pack]")) {
      window.print();
      return;
    }
    const tv = tg.closest("[data-tv]");
    const tn = tg.closest("[data-tnote]");
    if (tv || tn) {
      const verdict = tv ? tv.getAttribute("data-tv") : null;
      if (tv) [...$("tverdict").children].forEach((x) => x.classList.toggle("on", x === tv));
      const { error } = await sb.rpc("lk_teacher_verdict", {
        p_token: token,
        p_verdict: verdict,
        p_note: tn ? $("tnote").value.trim() : null
      });
      $("tmsg").textContent = error ? L().saveFail + error.message : L().tThanks;
      return;
    }
    const lcov = tg.closest("[data-lcov]");
    const lleft = tg.closest("[data-lleft]");
    if (lcov || lleft) {
      if (lcov) {
        COV = lcov.getAttribute("data-lcov");
        [...$("covrow").children].forEach((b) => b.classList.toggle("on", b === lcov));
      }
      if (lleft) LEFT = $("leftoff").value.trim();
      const { error } = await sb.rpc("lk_linked_coverage", { p_token: token, p_coverage: COV || null, p_left_off: LEFT || null });
      $("lratemsg").textContent = error ? L().saveFail + error.message : L().thanks;
      return;
    }
    const asp = tg.closest("[data-asp]");
    if (asp) {
      const parts = asp.getAttribute("data-asp").split(":");
      ASPECTS[parts[0]] = parts[1];
      [...$("q-" + parts[0]).children].forEach((x) => x.classList.toggle("on", x === asp));
      if (parts[0] === "reuse") {
        $("why").hidden = parts[1] === "yes";
        $("saybox").hidden = false;
      }
      const { error } = await sb.rpc("lk_rate_aspects_by_token", {
        p_token: token,
        p_session: SESSION,
        p_reuse: ASPECTS.reuse || null,
        p_clarity: ASPECTS.clarity || null,
        p_timefit: ASPECTS.timefit || null
      });
      const done = !!ASPECTS.reuse;
      $("ratemsg").textContent = error ? L().saveFail + error.message : done ? L().thanks : L().savedSoFar;
      return;
    }
    const cov = tg.closest("[data-cov]");
    const lo = tg.closest("[data-leftoff]");
    if (cov || lo) {
      if (cov) {
        COV = cov.getAttribute("data-cov");
        document.querySelectorAll("#covrow button").forEach((b) => b.classList.toggle("on", b === cov));
      }
      LEFT = maybe$("leftoff")?.value || "";
      if (!COV) {
        $("ratemsg").textContent = l.pickCovFirst;
        return;
      }
      const { error } = await sb.rpc("lk_rate_coverage_by_token", { p_token: token, p_coverage: COV, p_left_off: LEFT });
      $("ratemsg").textContent = error ? l.saveFail + error.message : l.thanks;
      return;
    }
    const pick = tg.closest("[data-pick]");
    if (pick && DATA) {
      LANG = pick.getAttribute("data-pick");
      try {
        localStorage.setItem("lk.lang", LANG);
      } catch {
      }
      render(DATA);
      window.scrollTo(0, 0);
      return;
    }
    const a = tg.closest("[data-assist]");
    if (a) {
      return runAssist({
        kind: a.getAttribute("data-assist"),
        ref: a.getAttribute("data-ref"),
        label: a.getAttribute("data-label"),
        variant: a.getAttribute("data-variant") || "",
        text: a.closest(".phase, .ps")?.innerText?.slice(0, 1200) || ""
      });
    }
    if (tg.closest("[data-assistnew]") && LASTASSIST) {
      return runAssist(Object.assign({}, LASTASSIST, { fresh: true }));
    }
    const fill = tg.closest("[data-fill]");
    if (fill) {
      return runAssist({
        kind: "filler",
        ref: "lesson",
        label: l.barLbl,
        minutes: Number(fill.getAttribute("data-fill"))
      });
    }
    if (tg.closest("[data-sheetclose]") || tg.id === "sheet") {
      $("sheet").hidden = true;
      return;
    }
    const xv = tg.closest("[data-xv]");
    if (xv) {
      const [id, up] = xv.getAttribute("data-xv").split(":");
      document.querySelectorAll("[data-xv]").forEach((b) => {
        b.disabled = true;
        b.classList.toggle("on", b === xv);
      });
      const { error } = await sb.rpc("lk_extra_verdict_by_token", { p_token: token, p_extra_id: Number(id), p_up: up === "1" });
      const m = maybe$("xvmsg");
      if (m) m.textContent = error ? "" : l.xvThanks;
      return;
    }
    const noteBtn = tg.closest("[data-note]");
    if (noteBtn) {
      const val = maybe$("noteq")?.value || "";
      if (!val.trim()) return;
      noteBtn.disabled = true;
      const { data, error } = await sb.rpc("lk_extra_note", {
        p_token: token,
        p_extra_id: Number(noteBtn.getAttribute("data-note")),
        p_note: val
      });
      $("notemsg").textContent = error || !data ? l.saveFail + (error?.message || "") : l.noteSaved;
      return;
    }
    const sayBtn = tg.closest("[data-comment]");
    if (sayBtn) {
      const val = maybe$("say")?.value || "";
      if (!val.trim()) return;
      SAY = val;
      sayBtn.disabled = true;
      const { error } = await sb.rpc("lk_rate_comment_by_token", { p_token: token, p_comment: val });
      $("ratemsg").textContent = error ? l.saveFail + error.message : l.thanks;
      return;
    }
    const reason = tg.closest("[data-reason]");
    if (reason) {
      const k = reason.getAttribute("data-reason");
      if (REASONS.has(k)) {
        REASONS.delete(k);
        reason.classList.remove("on");
      } else {
        REASONS.add(k);
        reason.classList.add("on");
      }
      const { error } = await sb.rpc("lk_rate_reasons_by_token", {
        p_token: token,
        p_reasons: [...REASONS]
      });
      $("ratemsg").textContent = error ? l.saveFail + error.message : l.thanks;
      return;
    }
  });
  load();
})();

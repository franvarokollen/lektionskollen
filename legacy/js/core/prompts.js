// ============================================================
// LLM prompts — builders for each generation task.
// subPrompt is fully research-backed:
//   • RedRover 2023-25 sub surveys (16,000+ responses): behaviour #1 issue
//   • NEA research: 73% disruptions from perceived unpreparedness in first 60s
//   • EdWeek 2024: subs scan numbered steps, don't read paragraphs
//   • Edutopia: active engagement >> worksheets for sub lessons
//   • Frontiers 2023 (SDT): fantasy/novelty/humour increase motivation
//   • Evidence-based VS (visual supports): agenda on board reduces anxiety
// ============================================================

window.topicSuggestionsPrompt = function topicSuggestionsPrompt({ stage, grade, subject, language, exclude = [] }) {
  const isGy = stage === "Gymnasiet";
  const isEn = language === "en";

  if (isEn) {
    const curriculum = isGy ? "Gy22 (the Swedish upper-secondary curriculum, 2022)" : "LGR22 (the Swedish compulsory-school curriculum, 2022)";
    const excludeText = exclude.length ? `\n\nDo not repeat these (already shown): ${exclude.join(", ")}` : "";
    const stageLabel = window.localizeLabel(stage, "en");
    const gradeLabel = window.localizeLabel(grade, "en");
    const subjectLabel = window.localizeLabel(subject, "en");
    return `You are a Swedish teacher. Suggest 8 suitable lesson topics/areas aligned with ${curriculum}.

Context:
- Stage: ${stageLabel}
- Grade: ${gradeLabel}
- Subject: ${subjectLabel}

The suggestions should:
- Be concrete topic/area names (not entire syllabuses), 2-5 words each
- Mirror the central content of ${curriculum} for this grade and subject
- Vary in type (e.g. factual area, skill, project idea, current theme)
- Be realistic to teach in one or a few lessons${excludeText}

IMPORTANT: Write all suggestions in English. Respond with only a valid JSON object, no markdown:
{
  "topics": ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4", "suggestion 5", "suggestion 6", "suggestion 7", "suggestion 8"]
}`;
  }

  const curriculum = isGy ? "Gy22 (gymnasieskolans läroplan 2022)" : "LGR22 (Läroplan för grundskolan 2022)";
  const excludeText = exclude.length ? `\n\nUndvik dessa förslag (redan visade): ${exclude.join(", ")}` : "";
  return `Du är en svensk lärare. Föreslå 8 lämpliga teman/områden för en lektion enligt ${curriculum}.

Kontext:
- Stadium: ${stage}
- Årskurs: ${grade}
- Ämne: ${subject}

Förslagen ska:
- Vara konkreta tema-/områdesnamn (inte hela kursplaner), 2-5 ord per förslag
- Spegla centralt innehåll i ${curriculum} för denna årskurs och ämne
- Variera i typ (t.ex. faktaområde, färdighet, projektidé, aktuellt tema)
- Vara realistiska att undervisa på en eller några lektioner${excludeText}

VIKTIGT: Skriv alla förslag på svenska. Svara endast med ett giltigt JSON-objekt, ingen markdown:
{
  "topics": ["förslag 1", "förslag 2", "förslag 3", "förslag 4", "förslag 5", "förslag 6", "förslag 7", "förslag 8"]
}`;
};

window.lessonPrompt = function lessonPrompt({ stage, grade, subject, topic, duration, branchIndex, totalBranches, language, detailLevel = "standard" }) {
  const isGy = stage === "Gymnasiet";
  const curriculum = isGy ? "Gy22 (gymnasieskolans läroplan 2022)" : "LGR22 (Läroplan för grundskolan 2022)";
  const isEn = language === "en";
  const langPrefix = isEn
    ? `**LANGUAGE: English.** Every single string value in the JSON response MUST be in natural English.\n\n`
    : `**SPRÅK: Svenska.** Allt innehåll i JSON-svaret ska skrivas på svenska.\n\n`;
  const langInstr = isEn
    ? "REMINDER: Write all content inside the JSON object in English."
    : "VIKTIGT: Skriv allt innehåll i JSON-objektet på svenska.";

  const stageLabel = isEn ? window.localizeLabel(stage, "en") : stage;
  const gradeLabel = isEn ? window.localizeLabel(grade, "en") : grade;
  const subjectLabel = isEn ? window.localizeLabel(subject, "en") : subject;

  const detailInstr = {
    quick: `DETALJNIVÅ: SNABB (en sida).
- 3-4 faser, max 2 punkter i teacherDoes, INGEN teacherScript, INGEN anticipatedResponses.
- INGEN extraTime, extraActivities, commonPitfalls, classroomManagement, homework.
- successCriteria max 2. teacherNotes max 2.
- boardLayout: kort men VERBATIM.`,
    standard: `DETALJNIVÅ: STANDARD (2 sidor).
- 4-5 faser. teacherScript bara för INTRO och AVSLUTNING.
- anticipatedResponses bara vid kontroversiella moment.
- extraTime: 2 nivåer (5 och 15 min). extraActivities: 2. commonPitfalls: 2-3.`,
    full: `DETALJNIVÅ: FULL (3-5 sidor).
- 3-6 faser, alla med teacherScript och anticipatedResponses.
- extraTime: 4 nivåer. extraActivities: 2-3. commonPitfalls: 3-5.
- Inkludera classroomManagement och homework.`,
  }[detailLevel] || "";

  const optionalFieldsHint = detailLevel === "quick"
    ? `\nVIKTIGT: Utelämna helt: extraTime, extraActivities, commonPitfalls, classroomManagement, homework, anticipatedResponses, teacherScript.`
    : detailLevel === "standard"
      ? `\nVIKTIGT: Utelämna classroomManagement.`
      : "";

  return `${langPrefix}Du är en svensk förstelärare som planerar en RIKTIG lektion enligt ${curriculum} från Skolverket.

LEKTIONSPARAMETRAR:
- Stadium: ${stageLabel} · Årskurs: ${gradeLabel} · Ämne: ${subjectLabel}
- Tema/område: "${topic}" · Lektionstid: ${duration} minuter

${detailInstr}${optionalFieldsHint}

Detta är förslag ${branchIndex + 1} av ${totalBranches}. Välj en tydligt annorlunda pedagogisk vinkel:
1. STRUKTURERAD UNDERVISNING (Direct Instruction) — Skolverkets sex-stegsmodell
2. PROBLEMBASERAT — eleverna brottas med ett problem först
3. UNDERSÖKANDE / LABORATIVT — utforskar konkret material
4. KOLLABORATIVT / DIALOGISKT — think-pair-share, EPA
5. SKAPANDE / GESTALTANDE — eleverna producerar något
6. PROJEKTBASERAT — längre arbete mot konkret produkt

🚫 FÖRBJUDET — FANTOMREFERENSER: referera aldrig till material som inte finns i planen.
🚫 FÖRBJUDET — JSON-fältnamn (boardLayout, embeddedContent etc.) i instruktioner till läraren.

${langInstr}

Svara ENDAST med giltigt JSON, ingen markdown:
{
  "title": "konkret lektionstitel (5-10 ord)",
  "approach": "pedagogisk modell",
  "approachReason": "en mening om varför modellen passar",
  "summary": "2-3 meningar om lektionens upplägg",
  "learningGoal": "konkret mätbart lärandemål",
  "priorKnowledge": "vad eleverna förväntas kunna (1-2 meningar)",
  "lgr22_connection": "konkret koppling till ${curriculum} (2-3 meningar)",
  "successCriteria": ["3-4 konkreta tecken att målet nåtts"],
  "boardLayout": "VERBATIM text till tavlan — agenda + begrepp + exempel. Inga platshållare. \\n för radbrytningar.",
  "materialsNeeded": ["5-8 specifika material med antal/typ"],
  "phases": [
    {
      "name": "Fasens namn",
      "minutes": 10,
      "purpose": "vad fasen åstadkommer (1 mening)",
      "teacherDoes": ["3-5 konkreta steg"],
      "teacherScript": ["2-4 exakta formuleringar i citattecken"],
      "studentsDo": ["2-4 konkreta beskrivningar"],
      "anticipatedResponses": ["2-3 troliga elevsvar + hur läraren bemöter"]
    }
  ],
  "checkForUnderstanding": ["3-5 exakta kontrollfrågor"],
  "exitTicket": { "title": "...", "task": "...", "purpose": "..." },
  "extraActivities": [{ "title": "...", "description": "...", "answer": "..." }],
  "differentiation": {
    "stod": ["3-4 konkreta stöttningar"],
    "utmaning": ["3-4 konkreta utmaningar"]
  },
  "extraTime": [
    { "minutes": 5,  "title": "...", "description": "...", "linkBack": "..." },
    { "minutes": 10, "title": "...", "description": "...", "linkBack": "..." },
    { "minutes": 15, "title": "...", "description": "...", "linkBack": "..." },
    { "minutes": 20, "title": "...", "description": "...", "linkBack": "..." }
  ],
  "commonPitfalls": ["3-5 saker som typiskt går fel + lösning"],
  "teacherNotes": ["3-5 praktiska anmärkningar"],
  "homework": "konkret hemuppgift eller 'Ingen läxa'",
  "assessment": "hur lektionen bidrar till bedömningsunderlaget"
}`;
};

// ============================================================
// subPrompt — Research-backed sub lesson generator.
// ============================================================
window.subPrompt = function subPrompt({ stage, grade, subject, topic, duration, baseLesson, language, detailLevel = "standard" }) {
  const isGy = stage === "Gymnasiet";
  const curriculum = isGy ? "Gy22" : "LGR22";
  const isEn = language === "en";
  const langPrefix = isEn
    ? `**LANGUAGE: English.** Every string value in the JSON MUST be in natural English.\n\n`
    : `**SPRÅK: Svenska.** Allt innehåll ska skrivas på svenska.\n\n`;
  const langInstr = isEn ? "REMINDER: Write everything in English." : "VIKTIGT: Skriv allt på svenska.";
  const stageLabel = isEn ? window.localizeLabel(stage, "en") : stage;
  const gradeLabel = isEn ? window.localizeLabel(grade, "en") : grade;
  const subjectLabel = isEn ? window.localizeLabel(subject, "en") : subject;

  const baseContext = baseLesson
    ? `\nELEVERNA HAR PRECIS GÅTT IGENOM:\n- Titel: ${baseLesson.title}\n- Lärandemål: ${baseLesson.learningGoal || baseLesson.objective || ""}\n- Vad de gjorde: ${(baseLesson.phases || []).map(p => `${p.name} (${p.minutes}min): ${(p.studentsDo || []).join("; ")}`).join(" | ")}`
    : `\nFRISTÅENDE LEKTION — anta vanliga förkunskaper för ${gradeLabel} i ${subjectLabel}.`;

  const rule1 = baseLesson
    ? "1. INGA NYA begrepp — befäster det eleverna redan kan."
    : "1. Anta vanliga förkunskaper. Grundläggande begrepp förklaras ordagrant i planen.";

  const detailScope = {
    quick: `DETALJNIVÅ: SNABB — skimmbar på 60 sekunder.
- 3-4 faser, 3 steg per fas, INGA teacherScript, INGA anticipatedResponses.
- embeddedContent: max 5 frågor/tal. Inga commonPitfalls. extraTime: 1 tier. rescueActivities: 2.`,
    standard: `DETALJNIVÅ: STANDARD — tydlig, ca 2 sidor.
- 3-5 faser, 4 steg per fas, teacherScript för intro/avslutning.
- embeddedContent: 5-8. commonPitfalls: 2-3. extraTime: 2 tiers. rescueActivities: 3.`,
    full: `DETALJNIVÅ: FULL — komplett, ca 3 sidor.
- 4-5 faser, alla med teacherScript och anticipatedResponses.
- embeddedContent: 8-12. commonPitfalls: 3-5. classroomManagement: 3-4 tekniker. extraTime: 4 tiers. rescueActivities: 4.`,
  }[detailLevel] || "";

  const optFields = detailLevel === "quick"
    ? "\nUTELÄMNA: anticipatedResponses, teacherScript, classroomManagement, commonPitfalls."
    : "";

  return `${langPrefix}Du är expert på att skapa VIKARIELEKTION enligt ${curriculum}. Planen ska vara OMEDELBART ANVÄNDBAR — vikarien kan börja undervisa inom 2 minuter.

## VAD FORSKNING SÄGER OM FRAMGÅNGSRIKA VIKARIELEKTIONER:

**Beteende är #1 utmaningen** (RedRover sub-survey 2023-25, 16 000+ vikarier):
Vikarier slutar på grund av beteende, inte dåliga lektioner. Varje plan MÅSTE inkludera:
→ Exakt vad vikarien gör DE FÖRSTA 60 SEKUNDERNA (auktoritet etableras nu eller aldrig)
→ Exakta fraser för positiv förstärkning (SDT-forskning visar att dessa fungerar)
→ "Rescue activities" — vad vikarien gör om lektionen spårar ur
→ Three-touch rule: Närvaro (gå nära) → Icke-verbal (ögonkontakt) → Verbal (förnamn)

**Vikarier skannar, de läser inte** (EdWeek 2024):
Varje steg = EN rad, börjar med ett VERB.
✅ "1. Skriv på tavlan: [text]" · "2. Säg: '[mening]'" · "3. Ge 8 min till:"
❌ "Introducera lektionen och förklara syftet för eleverna på ett engagerande sätt."

**Aktiv > Passiv** (high-quality sub teaching research, Edutopia):
Kalkylblad och passivt arbete skapar kaos. Välj: quiz, tävling, par-arbete, rörelse, skapande.
First/Then-struktur motiverar: "Gör X (5 min) → sedan Y (roligare del)."

**Visuell agenda minskar elevers ångest** (evidensbaserad VS-praktik):
Elever som vet vad som händer är lugnare och mer samarbetsvilliga.

**Fantasy/novelty/humour ökar motivation** (SDT-forskning, Frontiers 2023):
Bygg in ett overraskningsmoment — det behöver inte vara stort, men ska vara oväntat.

KONTEXT:
- Stadium: ${stageLabel} · Årskurs: ${gradeLabel} · Ämne: ${subjectLabel}
- Tema: "${topic}" · Tid: ${duration} min${baseContext}

${detailScope}${optFields}

ABSOLUTA KRAV:
${rule1}
2. ALLT INNEHÅLL förberett i planen — inga "läs ur boken", inga externa resurser utan URL.
3. MATERIAL = papper, pennor, tavla, ev. projektor. INGET som kräver utskrift/kopiering/labbmaterial.
4. Roligt och engagerande — aktivt, inte passivt.
5. Planen FÅR INTE referera till något som inte skapas explicit i planen (fantomreferenser).
6. JSON-fältnamn ALDRIG i instruktioner till vikarien.

${langInstr}

Svara ENDAST med giltigt JSON, ingen markdown:
{
  "title": "rolig, tydlig titel med en hook om lektionens innehåll",
  "approach": "Vikarielektion (t.ex. quiz / par-arbete / stations / tävling / skapande)",
  "summary": "2 meningar: vad gör eleverna, varför är det kul/meningsfullt",
  "learningGoal": "vad eleverna befäster eller tränar (en mening)",
  "priorKnowledge": "vad eleverna förväntas kunna (1 mening)",
  "lgr22_connection": "kort koppling till ${curriculum} (1 mening)",
  "successCriteria": ["2-3 enkla tecken på att lektionen lyckas"],

  "firstSixtySeconds": {
    "boardMessage": "VERBATIM: välkomsthälsning + agenda (3-4 numrerade punkter) + vikariets namn. Skrivs på tavlan INNAN eleverna kommer in.",
    "greeting": "Exakt vad vikarien säger när alla sitter ner (30 sek, varm men tydlig, etablerar förväntningar direkt)",
    "authorityTip": "1 konkret tip för att etablera respekt direkt (t.ex. stå vid dörren, hälsa varje elev vid namn med seatingplan)"
  },

  "confidenceChecklist": [
    "✓ Namn skrivet på tavlan",
    "✓ Agenda synlig för hela klassen",
    "Ytterligare 3-4 konkreta punkter vikarien bockar av INNAN lektionen"
  ],

  "boardLayout": "VERBATIM hela taveltexten: välkomst, numrerad agenda, nyckelbegrepp med definitioner, eventuella frågor/tal. Inga platshållare. \\n för radbrytningar.",

  "projectorContent": "Om projektor finns: konkret URL eller 'Sök: [exakt sökterm]' eller text i helskärm. null om inte relevant.",

  "materialsNeeded": ["ENDAST basics: papper, pennor, tavla, ev. projektor. Max 4 punkter."],

  "positiveReinforcementPhrases": [
    "4-5 EXAKTA fraser att säga när elever gör rätt (t.ex. 'Jag märker att [namn] verkligen anstränger sig', 'Klassen imponerar på mig')"
  ],

  "phases": [
    {
      "name": "Fasens namn",
      "minutes": 10,
      "purpose": "vad fasen åstadkommer (1 mening)",
      "teacherDoes": [
        "1. [Verb]: [exakt handling]",
        "2. [Verb]: [exakt handling]",
        "3. [Verb]: [exakt handling]"
      ],
      "teacherScript": ["'Exakt vad vikarien säger' — naturlig ton, inte stelt"],
      "studentsDo": ["Konkret beskrivning av elevernas aktivitet"],
      "anticipatedResponses": ["Troliga svar (rätt + fel) + hur vikarien bemöter konkret"]
    }
  ],

  "embeddedContent": {
    "questions": [
      { "q": "fullständig fråga", "expectedAnswer": "kort svar", "ifStuck": "tips om eleverna fastnar" }
    ],
    "problems": [
      { "problem": "fullständig uppgift", "answer": "svar med förklaring", "difficulty": "lätt/medel/svår" }
    ],
    "texts": [
      { "title": "titel", "content": "fullständig text max 150 ord", "purpose": "vad eleverna gör med den" }
    ],
    "exampleAnswers": [
      { "scenario": "om en elev säger X", "response": "exakt vad vikarien svarar" }
    ]
  },

  "exitTicket": {
    "title": "avslutande check",
    "task": "konkret uppgift (eleverna ska känna att de åstadkommit något)",
    "purpose": "vad vikarien lämnar till ordinarie lärare"
  },

  "extraActivities": [
    { "title": "om tid finns över", "description": "konkret, inga förberedelser", "answer": "facit om relevant" }
  ],

  "rescueActivities": [
    {
      "scenario": "Om klassen är stökig och inte vill sätta igång",
      "activity": "Konkret aktivitet som omedelbart fångar uppmärksamheten",
      "script": "Exakt vad vikarien säger"
    },
    {
      "scenario": "Om lektionen tar slut 20 min för tidigt",
      "activity": "Fullständig aktivitet utan förberedelse",
      "script": "Exakt vad vikarien säger"
    },
    {
      "scenario": "Om en enskild elev vägrar delta",
      "activity": "Icke-konfrontativ strategi som inkluderar eleven",
      "script": "Exakt vad vikarien säger"
    }
  ],

  "differentiation": {
    "stod": ["2-3 enkla stöttningar utan extra material"],
    "utmaning": ["2-3 utmaningar för snabba elever — konkret uppgift"]
  },

  "extraTime": [
    { "minutes": 5,  "title": "...", "description": "...", "linkBack": "..." },
    { "minutes": 10, "title": "...", "description": "...", "linkBack": "..." },
    { "minutes": 15, "title": "...", "description": "...", "linkBack": "..." },
    { "minutes": 20, "title": "...", "description": "...", "linkBack": "..." }
  ],

  "commonPitfalls": [
    "Vanlig fallgrop + konkret lösning med script (t.ex. 'Om alla pratar på en gång: räkna ner från 5 tyst med fingrar. Invänta tystnad.')"
  ],

  "classroomManagement": [
    "Konkret teknik med exakt script (t.ex. 'Three-touch rule: 1. Gå nära utan att säga något. 2. Ögonkontakt + tyst nick mot arbetet. 3. Säg lugnt: [Förnamn], snälla.')"
  ],

  "teacherNotes": ["1-3 korta praktiska tips"],

  "subTip": "Det viktigaste tipset (max 20 ord, börja med ett verb)"
}`;
};

window.translateLessonPrompt = function translateLessonPrompt({ lesson, targetLanguage }) {
  const target = targetLanguage === "en" ? "English" : "Swedish";
  return `You are a translator. Translate this lesson plan JSON from Swedish to ${target}.

RULES:
1. Output ONLY the translated JSON. No commentary, no markdown, no backticks.
2. Preserve the EXACT JSON structure — same keys, same nesting, same arrays.
3. Translate every string VALUE. Do NOT translate JSON keys.
4. Keep numbers and IDs unchanged.
5. Keep "LGR22"/"Gy22" but translate surrounding text.
6. Subject names: "Matematik"→"Mathematics", "Svenska"→"Swedish", "Engelska"→"English", "NO"→"Science", "SO"→"Social Studies", "Idrott"→"PE", "Bild"→"Visual Arts", "Musik"→"Music".
7. Phase names: "Inledning"→"Introduction", "Genomgång"→"Direct teaching", "Stödd övning"→"Guided practice", "Enskild övning"→"Independent practice", "Avslutning"→"Closing".
8. Translate meaning naturally, not word-for-word.

LESSON JSON TO TRANSLATE:
${JSON.stringify(lesson, null, 2)}`;
};

function extrasContextBlock(lesson, language) {
  const isSv = language === "sv";
  const lines = [];
  lines.push(isSv ? "LEKTIONSKONTEXT:" : "LESSON CONTEXT:");
  lines.push(`- ${isSv ? "Titel" : "Title"}: ${lesson.title}`);
  if (lesson.learningGoal) lines.push(`- ${isSv ? "Lärandemål" : "Learning goal"}: ${lesson.learningGoal}`);
  if (lesson.summary) lines.push(`- ${isSv ? "Sammanfattning" : "Summary"}: ${lesson.summary}`);
  if (lesson.phases?.length) lines.push(`- ${isSv ? "Faser" : "Phases"}: ${lesson.phases.map(p => `${p.name} (${p.minutes}min)`).join(" | ")}`);
  return lines.join("\n");
}

window.extrasPrompt = function extrasPrompt({ kind, lesson, stage, grade, subject, topic, duration, language }) {
  const isSv = language === "sv";
  const isEn = !isSv;
  const langPrefix = isEn
    ? `**LANGUAGE: English.** Every string value in the JSON must be in natural English.\n\n`
    : `**SPRÅK: Svenska.** Allt innehåll ska skrivas på svenska.\n\n`;
  const langInstr = isSv ? "Svara på svenska." : "Respond in English.";
  const ctx = extrasContextBlock(lesson, language);
  const stageLabel = isEn ? window.localizeLabel(stage, "en") : stage;
  const gradeLabel = isEn ? window.localizeLabel(grade, "en") : grade;
  const subjectLabel = isEn ? window.localizeLabel(subject, "en") : subject;
  const meta = `${stageLabel} · ${isSv ? "Årskurs" : "Grade"} ${gradeLabel} · ${subjectLabel} · "${topic}" · ${duration} min`;
  const youngerLearner = (typeof grade === "number" && grade <= 6) || /^F-|^åk ?[1-6]/i.test(String(grade));

  const builders = {
    worksheet: () => `${langPrefix}Du genererar ett ARBETSBLAD baserat på lektionen nedan.
${meta}\n${ctx}
KRAV: 5-10 uppgifter som befäster lärandemålet. Varje uppgift har konkret frågetext. Inkludera FACIT. Variera typer. INGA fantomreferenser.
${langInstr} Svara ENDAST med giltigt JSON, ingen markdown:
{
  "title": "arbetsbladets titel",
  "instructions": "instruktion till eleven (1-2 meningar)",
  "exercises": [{ "n": 1, "type": "open|fill|multiple|short|calc", "question": "fullständig frågetext", "answer": "fullständigt facit", "explanation": "kort förklaring om relevant" }],
  "answerKeyNote": "kommentar till läraren (1 mening)"
}`,

    badges: () => `${langPrefix}Du genererar 3-5 belöningsmärken för lektionen nedan.
${meta}\n${ctx}
${youngerLearner ? "Yngre elever — lekfullt språk, roliga namn, känslor." : "Äldre elever — subtilt, inte barnsligt. Tänk 'expert', 'analytiker'."}
KRAV: Varje märke kopplas till konkret beteende. Kort titel (1-3 ord), kriterium, emoji, hex-färger.
${langInstr} Svara ENDAST med giltigt JSON:
{
  "badges": [{ "title": "titel", "criterion": "vad eleven gjorde (en mening)", "emoji": "🌟", "color": "#hex", "textColor": "#hex" }]
}`,

    flashcards: () => `${langPrefix}Du genererar 8-12 flashcards baserade på lektionen nedan.
${meta}\n${ctx}
KRAV: Framsida = ord/begrepp. Baksida = definition på elevernas nivå (årskurs ${grade}). Exempelfras vid relevans. Bara begrepp som introduceras i lektionen.
${langInstr} Svara ENDAST med giltigt JSON:
{
  "title": "korten-uppsättningens titel",
  "cards": [{ "front": "ord eller begrepp", "back": "definition (max 20 ord)", "example": "exempelfras (valfritt)" }]
}`,

    discussionCards: () => `${langPrefix}Du genererar 6-10 diskussionskort för lektionen nedan.
${meta}\n${ctx}
KRAV: Öppna frågor (Varför, Hur, Vad händer om, Jämför). Ingen ja/nej. "Lyssna efter" för läraren. Anpassade till årskurs ${grade}.
${langInstr} Svara ENDAST med giltigt JSON:
{
  "title": "korten-uppsättningens titel",
  "instructions": "instruktion till gruppen (1-2 meningar)",
  "cards": [{ "n": 1, "question": "öppen fråga", "listenFor": "vad ett bra svar innehåller (en mening)" }]
}`,

    anchorChart: () => `${langPrefix}Du genererar en TAVELPLAN för lektionen nedan.
${meta}\n${ctx}
KRAV: Huvudrubrik + 3-5 sektioner med underrubrik och 2-5 konkreta punkter. Inga platshållare. Kan kopieras rakt till tavlan eller A3.
${langInstr} Svara ENDAST med giltigt JSON:
{
  "title": "tavelplanens huvudrubrik",
  "subtitle": "kort underrubrik (1 mening)",
  "sections": [{ "heading": "underrubrik", "items": ["punkt 1", "punkt 2"], "visualHint": "valfri instruktion om skiss" }],
  "keyTakeaway": "den ENA meningen eleverna minns"
}`,

    diagram: () => `${langPrefix}Du genererar ett MERMAID-DIAGRAM för lektionen nedan.
${meta}\n${ctx}
KRAV: Rätt typ (flowchart/timeline/mindmap/sequenceDiagram/classDiagram). Läsbart, konkret innehåll från lektionen. Bara Mermaid-syntax i "code", INGA backticks.
${langInstr} Svara ENDAST med giltigt JSON:
{
  "type": "flowchart|timeline|mindmap|sequenceDiagram|classDiagram",
  "title": "diagrammets titel",
  "description": "vad diagrammet visar (1-2 meningar)",
  "code": "ren mermaid-syntax utan code-fence",
  "useCase": "när i lektionen läraren visar det"
}`,

    imageSearch: () => `${langPrefix}Du föreslår BILDSÖKNINGAR per fas för lektionen nedan.
${meta}\n${ctx}
KRAV: 2-3 sökfrågor per fas på engelska. Rätt källa (Pixabay/Unsplash/Wikipedia Commons). Kort förklaring varför bilden hjälper. Direktlänk.
${langInstr} Svara ENDAST med giltigt JSON:
{
  "phaseSearches": [{
    "phaseName": "fasens namn från lektionen",
    "searches": [{ "query": "engelska sökord", "source": "pixabay|unsplash|commons|other", "url": "https://...", "why": "varför bilden hjälper (1 mening)" }]
  }]
}`,
  };

  const builder = builders[kind];
  if (!builder) throw new Error(`Unknown extras kind: ${kind}`);
  return builder();
};

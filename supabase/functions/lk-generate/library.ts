// Written plans, served while no model is configured. Real content in both
// languages, so the workflow can be judged before anyone pays for tokens.
// Clock times are computed from the actual lesson slot.
//
// The model path (prompt.ts) was always bilingual; this library was not.

function clock(start: string, offset: number): string {
  const [h, m] = start.split(':').map(Number)
  const t = h * 60 + m + offset
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/** Spread phase shares across the real lesson length. */
function schedule(start: string, minutes: number, shares: number[]): string[] {
  const total = shares.reduce((a, b) => a + b, 0)
  const out: string[] = []
  let acc = 0
  shares.forEach((s, i) => {
    const len = i === shares.length - 1
      ? minutes - acc
      : Math.max(5, Math.round((s / total) * minutes / 5) * 5)
    out.push(`${clock(start, acc)}–${clock(start, acc + len)}`)
    acc += len
  })
  return out
}

type Phase = { n: string; say: string; pupils: string; expect: string; checks: { q: string; a: string }[] }
type Tpl = {
  title: string; curriculum: string; goal: string; criteria: string[]; summary: string
  board: string; need: string; fallback: string; phases: Phase[]
  materials: { h: string; body: string }[]; tasks: { q: string; a: string }[]
  stuck: string; ahead: string; wrong: string; exit: { q: string; a: string }; handover: string
}
type Pair = { shares: number[]; sv: Tpl; en: Tpl }

// ── Matematik ────────────────────────────────────────────────
const MA: Pair = {
  shares: [10, 15, 30, 5],
  sv: {
    title: 'Bråk på tallinjen',
    curriculum: 'Lgr22, Matematik — Tal och tals användning: rationella tal och deras egenskaper.',
    goal: 'Jag kan placera bråk på en tallinje och avgöra vilket av två bråk som är störst.',
    criteria: ['Jag kan förklara vad täljaren och nämnaren betyder', 'Jag kan placera 1/2, 1/4 och 3/4 rätt på en tallinje', 'Jag kan motivera varför 1/3 är större än 1/4'],
    summary: 'Eleverna repeterar vad ett bråk är och placerar sedan bråk på en tallinje. Du behöver inte kunna matematik — allt du ska säga står utskrivet och alla svar finns med.',
    board: 'Dagens mål\nPlacera bråk på tallinjen\n\n  0 ————————————— 1\n\nTäljare  = hur många delar vi har\nNämnare = hur många delar helheten är delad i',
    need: 'Whiteboard och penna. Inget annat krävs.',
    fallback: 'Fungerar inte projektorn spelar det ingen roll — hela lektionen går på tavlan.',
    phases: [
      { n: 'Repetition', say: '"Vad betyder nämnaren i ett bråk? Ingen räcker upp handen — jag frågar fyra av er."', pupils: 'Svarar när du pekar. Skriv svaren på tavlan.', expect: 'Rätt svar: hur många delar helheten är delad i. Vanligaste felet är att blanda ihop täljare och nämnare. Säg då: "Nästan. Nämnaren står under strecket."', checks: [{ q: 'Vilket är störst, 1/3 eller 1/4?', a: '1/3 — ju fler delar, desto mindre blir varje del.' }] },
      { n: 'Genomgång på tavlan', say: '"Titta på tallinjen. Noll här, ett här. Var hamnar en halv? Precis i mitten. Var hamnar en fjärdedel?"', pupils: 'Tittar och svarar. Två elever får komma fram och sätta kryss.', expect: 'En fjärdedel hamnar halvvägs mellan 0 och en halv. Sätter någon den för nära 1: "Tänk på att fyra fjärdedelar ska få plats innan ettan."', checks: [{ q: 'Hur många fjärdedelar går det på en hel?', a: 'Fyra.' }] },
      { n: 'Eget arbete', say: '"Nu jobbar ni själva med uppgifterna på tavlan. Rita tallinjen i blocket först. Räck upp handen om ni fastnar."', pupils: 'Ritar tallinje och placerar bråken enskilt.', expect: 'De flesta klarar 1–4. Uppgift 5 och 6 är svårare. Säg inte svaret — fråga: "Hur många delar är helheten delad i här?"', checks: [] },
      { n: 'Avslut', say: '"Skriv svaret på exit ticket-frågan på en lapp och lämna den när ni går."', pupils: 'Skriver och lämnar lappen.', expect: '—', checks: [] },
    ],
    materials: [{ h: 'Uppgifter — skriv upp på tavlan', body: 'Rita en tallinje från 0 till 1. Placera:\n\n1.  1/2\n2.  1/4\n3.  3/4\n4.  1/3\n5.  2/3\n6.  5/8\n\nExtra: placera 5/4. Vad händer?' }],
    tasks: [{ q: '1. Placera 1/2', a: 'Exakt i mitten.' }, { q: '2. Placera 1/4', a: 'Halvvägs mellan 0 och 1/2.' }, { q: '3. Placera 3/4', a: 'Halvvägs mellan 1/2 och 1.' }, { q: '4. Placera 1/3', a: 'En aning till höger om 1/4.' }, { q: '5. Placera 2/3', a: 'Mellan 1/2 och 3/4, närmare 3/4.' }, { q: '6. Placera 5/8', a: 'Strax till höger om 1/2.' }, { q: 'Extra: 5/4', a: 'Utanför linjen, till höger om 1 — linjen måste förlängas.' }],
    stuck: 'Låt eleven bara jobba med halvor och fjärdedelar. Rita en pizza delad i fyra bitar på deras papper.',
    ahead: 'Be dem placera 7/8 och 9/8 och förklara för en bänkkamrat varför 9/8 hamnar efter ettan.',
    wrong: 'Kommer de inte igång: byt till tyst enskilt arbete med uppgift 1–3 på papper som du samlar in. Blir det stökigt efter 20 minuter: avbryt, låt dem skriva tre saker de minns om bråk, samla in, och ta 4–6 gemensamt på tavlan.',
    exit: { q: 'Vilket är störst — 2/3 eller 3/5?', a: '2/3 (0,67 mot 0,60).' },
    handover: 'Vi hann uppgift 1–6. Flera fastnade på 5/8. Exit tickets ligger på katedern.',
  },
  en: {
    title: 'Fractions on the number line',
    curriculum: 'Lgr22, Mathematics — Number and the use of number: rational numbers and their properties.',
    goal: 'I can place fractions on a number line and say which of two fractions is larger.',
    criteria: ['I can explain what the numerator and denominator mean', 'I can place 1/2, 1/4 and 3/4 correctly on a number line', 'I can explain why 1/3 is larger than 1/4'],
    summary: 'Pupils revise what a fraction is, then place fractions on a number line. You do not need to know any maths — everything you say is written out and every answer is included.',
    board: "Today's goal\nPlace fractions on the number line\n\n  0 ————————————— 1\n\nNumerator   = how many parts we have\nDenominator = how many parts the whole is split into",
    need: 'Whiteboard and pen. Nothing else is required.',
    fallback: 'If the projector is broken it makes no difference — the whole lesson runs on the board.',
    phases: [
      { n: 'Revision', say: '"What does the denominator mean in a fraction? No hands up — I will ask four of you."', pupils: 'Answer when you point at them. Write the answers on the board.', expect: 'Correct answer: how many parts the whole is split into. The commonest mistake is swapping numerator and denominator. Say: "Almost. The denominator is the one under the line."', checks: [{ q: 'Which is bigger, 1/3 or 1/4?', a: '1/3 — the more parts you split into, the smaller each part gets.' }] },
      { n: 'Board explanation', say: '"Look at the number line. Zero here, one here. Where does a half go? Exactly in the middle. Where does a quarter go?"', pupils: 'Watch and answer. Two pupils come up and mark a cross.', expect: 'A quarter sits halfway between 0 and a half. If someone puts it too close to 1: "Remember four quarters have to fit before you reach one."', checks: [{ q: 'How many quarters fit in a whole?', a: 'Four.' }] },
      { n: 'Individual work', say: '"Now work on the tasks on the board by yourselves. Draw the number line in your book first. Put your hand up if you get stuck."', pupils: 'Draw a number line and place the fractions individually.', expect: 'Most manage 1–4. Tasks 5 and 6 are harder. Do not give the answer — ask: "How many parts is the whole split into here?"', checks: [] },
      { n: 'Close', say: '"Write the answer to the exit question on a slip of paper and hand it in on your way out."', pupils: 'Write and hand in the slip.', expect: '—', checks: [] },
    ],
    materials: [{ h: 'Tasks — write these on the board', body: 'Draw a number line from 0 to 1. Place:\n\n1.  1/2\n2.  1/4\n3.  3/4\n4.  1/3\n5.  2/3\n6.  5/8\n\nExtra: place 5/4. What happens?' }],
    tasks: [{ q: '1. Place 1/2', a: 'Exactly in the middle.' }, { q: '2. Place 1/4', a: 'Halfway between 0 and 1/2.' }, { q: '3. Place 3/4', a: 'Halfway between 1/2 and 1.' }, { q: '4. Place 1/3', a: 'Slightly to the right of 1/4.' }, { q: '5. Place 2/3', a: 'Between 1/2 and 3/4, closer to 3/4.' }, { q: '6. Place 5/8', a: 'Just to the right of 1/2.' }, { q: 'Extra: 5/4', a: 'Off the line, to the right of 1 — the line has to be extended.' }],
    stuck: 'Let the pupil work only with halves and quarters. Draw a pizza cut into four slices on their paper.',
    ahead: 'Ask them to place 7/8 and 9/8 and explain to a neighbour why 9/8 lands past one.',
    wrong: 'If they will not start: switch to silent individual work on tasks 1–3 on paper that you collect in. If it gets noisy after 20 minutes: stop, have them write three things they remember about fractions, collect it, and do 4–6 together on the board.',
    exit: { q: 'Which is bigger — 2/3 or 3/5?', a: '2/3 (0.67 against 0.60).' },
    handover: 'We got through tasks 1–6. Several got stuck on 5/8. Exit tickets are on the desk.',
  },
}

// ── Svenska ──────────────────────────────────────────────────
const SV: Pair = {
  shares: [8, 12, 20, 5],
  sv: {
    title: 'Argumenterande text — tes och argument',
    curriculum: 'Lgr22, Svenska — Läsa och skriva: argumenterande texter och deras uppbyggnad.',
    goal: 'Jag kan hitta tesen i en argumenterande text och ge två argument för min egen åsikt.',
    criteria: ['Jag vet vad en tes är', 'Jag kan ge minst två argument för min åsikt', 'Jag kan skilja ett argument från en åsikt'],
    summary: 'Eleverna lär sig vad en tes är, lyssnar på ett kort exempel och skriver sedan egna argument. Allt material står utskrivet nedan.',
    board: 'Dagens mål\nHitta tesen · Ge två argument\n\nTES = det du tycker\nARGUMENT = varför du tycker det',
    need: 'Whiteboard och penna. Papper till eleverna.',
    fallback: 'Ingen teknik krävs.',
    phases: [
      { n: 'Start', say: '"Vem tycker att skoldagen borde börja senare? Räck inte upp handen — jag frågar tre av er varför."', pupils: 'Svarar muntligt.', expect: 'De flesta svarar "för att man är trött". Skriv upp det: "Det där är ett argument. Nu ska vi lära oss vad det heter."', checks: [{ q: 'Vad kallas det du tycker?', a: 'Tesen.' }] },
      { n: 'Genomgång', say: '"Jag läser en kort text. Lyssna efter vad personen tycker, och varför."', pupils: 'Lyssnar och svarar efteråt.', expect: 'Tesen är längre raster. Argumenten är att man orkar bättre och hinner äta.', checks: [{ q: 'Vad är tesen i texten?', a: 'Att skolan ska ha längre raster.' }] },
      { n: 'Eget arbete', say: '"Välj en av de tre frågorna på tavlan. Skriv din tes och minst två argument."', pupils: 'Skriver enskilt.', expect: 'Vanligt fel: två åsikter istället för två argument. Fråga då: "Men varför tycker du så?"', checks: [] },
      { n: 'Avslut', say: '"Läs din tes högt för din bänkkamrat. Lämna sedan in pappret."', pupils: 'Läser för varandra och lämnar in.', expect: '—', checks: [] },
    ],
    materials: [
      { h: 'Texten du läser högt', body: '"Jag tycker att skolan ska ha längre raster. För det första orkar man koncentrera sig bättre efter att ha rört på sig. För det andra hinner man inte äta sin frukt på tio minuter om man också ska hinna gå ut. Längre raster skulle göra att vi lär oss mer, inte mindre."' },
      { h: 'Frågor att skriva upp', body: 'Välj EN och skriv din tes + två argument:\n\n1. Borde läxor förbjudas?\n2. Borde alla elever ha skoluniform?\n3. Borde mobiler vara tillåtna på rasten?' },
    ],
    tasks: [{ q: 'Vad är tesen i texten?', a: 'Att skolan ska ha längre raster.' }, { q: 'Vilka två argument ges?', a: 'Man orkar koncentrera sig bättre, och man hinner äta.' }, { q: 'Är "jag tycker det är tråkigt" ett argument?', a: 'Nej, det är en åsikt. Ett argument förklarar varför.' }],
    stuck: 'Ge eleven fråga 3 och en mening att fylla i: "Jag tycker att ___ för att ___ och för att ___."',
    ahead: 'Be dem skriva ett motargument — vad skulle någon som tycker tvärtom säga?',
    wrong: 'Kommer de inte igång: gör fråga 1 gemensamt på tavlan och låt dem skriva av och lägga till ett eget argument. Blir det stökigt: tyst skrivande i fem minuter, samla in, avsluta med högläsning.',
    exit: { q: 'Skriv en tes om skolmaten.', a: 'Allt som börjar med "Jag tycker att skolmaten ska…" godkänns.' },
    handover: 'Vi hann hela momentet. Några blandade ihop åsikt och argument. Inlämnade papper ligger på katedern.',
  },
  en: {
    title: 'Persuasive writing — claim and reasons',
    curriculum: 'Lgr22, Swedish — Reading and writing: persuasive texts and how they are built.',
    goal: 'I can find the claim in a persuasive text and give two reasons for my own opinion.',
    criteria: ['I know what a claim is', 'I can give at least two reasons for my opinion', 'I can tell a reason apart from an opinion'],
    summary: 'Pupils learn what a claim is, listen to a short example, then write reasons of their own. Every material is written out below.',
    board: "Today's goal\nFind the claim · Give two reasons\n\nCLAIM  = what you think\nREASON = why you think it",
    need: 'Whiteboard and pen. Paper for the pupils.',
    fallback: 'No technology needed.',
    phases: [
      { n: 'Starter', say: '"Who thinks the school day should start later? Hands down — I will ask three of you why."', pupils: 'Answer out loud.', expect: 'Most say "because you are tired". Write it up: "That is a reason. Now we will learn what it is called."', checks: [{ q: 'What do we call the thing you think?', a: 'The claim.' }] },
      { n: 'Explanation', say: '"I am going to read a short text. Listen for what the writer thinks, and why."', pupils: 'Listen, then answer.', expect: 'The claim is longer breaks. The reasons are that you concentrate better and you have time to eat.', checks: [{ q: 'What is the claim in the text?', a: 'That school should have longer breaks.' }] },
      { n: 'Individual work', say: '"Pick one of the three questions on the board. Write your claim and at least two reasons."', pupils: 'Write individually.', expect: 'Common mistake: two opinions instead of two reasons. Ask: "But why do you think that?"', checks: [] },
      { n: 'Close', say: '"Read your claim out to the person next to you. Then hand the paper in."', pupils: 'Read to each other and hand in.', expect: '—', checks: [] },
    ],
    materials: [
      { h: 'The text you read out', body: '"I think school should have longer breaks. First, you concentrate better after moving about. Second, you cannot eat your fruit in ten minutes if you also have to get outside. Longer breaks would mean we learn more, not less."' },
      { h: 'Questions to write on the board', body: 'Pick ONE and write your claim + two reasons:\n\n1. Should homework be banned?\n2. Should all pupils wear a uniform?\n3. Should phones be allowed at break?' },
    ],
    tasks: [{ q: 'What is the claim in the text?', a: 'That school should have longer breaks.' }, { q: 'Which two reasons are given?', a: 'You concentrate better, and you have time to eat.' }, { q: 'Is "I think it is boring" a reason?', a: 'No, that is an opinion. A reason explains why.' }],
    stuck: 'Give the pupil question 3 and a sentence to fill in: "I think ___ because ___ and because ___."',
    ahead: 'Ask them to write a counter-argument — what would someone who disagrees say?',
    wrong: 'If they will not start: do question 1 together on the board and let them copy it and add one reason of their own. If it gets noisy: silent writing for five minutes, collect it in, finish by reading aloud.',
    exit: { q: 'Write a claim about school dinners.', a: 'Anything beginning "I think school dinners should…" is accepted.' },
    handover: 'We covered the whole thing. A few mixed up opinion and reason. The papers handed in are on the desk.',
  },
}

// ── Engelska ─────────────────────────────────────────────────
const EN: Pair = {
  shares: [10, 15, 30, 5],
  sv: {
    title: 'Past perfect — telling a story',
    curriculum: 'Lgr22, Engelska — Tala, skriva och samtala: strategier för språklig korrekthet.',
    goal: 'Jag kan använda past perfect för att visa vad som hände först.',
    criteria: ['Jag vet när man använder past perfect', 'Jag kan bilda had + perfektparticip', 'Jag kan skriva meningar som blandar past simple och past perfect'],
    summary: 'Eleverna repeterar past perfect och skriver egna meningar. Du behöver inte kunna engelsk grammatik — regeln och alla svar finns nedan.',
    board: "Today's goal\nUse past perfect to show what happened FIRST\n\nhad + past participle\n\n\"When I arrived, the train had left.\"\n   (2nd)                (1st)",
    need: 'Whiteboard och penna.',
    fallback: 'Ingen teknik krävs.',
    phases: [
      { n: 'Warm-up', say: '"Listen to these two sentences. Which thing happened first? I will ask four of you — no hands."', pupils: 'Svarar muntligt.', expect: 'Det som står i past perfect hände först. Vanligt fel: att tro att ordningen i meningen är tidsordningen.', checks: [{ q: '"When she called, he had gone out." Who acted first?', a: 'He went out first.' }] },
      { n: 'Rule and examples', say: '"The rule is on the board. Had plus the third form. Go — eat — see. What are the third forms?"', pupils: 'Svarar: gone, eaten, seen. Skriv upp dem.', expect: 'Några säger "went" istället för "gone". Säg: "That is the second form. We need the third."', checks: [{ q: 'Third form of "write"?', a: 'Written.' }] },
      { n: 'Written practice', say: '"Write the six sentences from the board in your notebook. Then write three of your own."', pupils: 'Skriver enskilt.', expect: 'Mening 5 och 6 är svårast. Fråga: "Which one happened first?"', checks: [] },
      { n: 'Close', say: '"Write the exit question on a slip and hand it to me on your way out."', pupils: 'Skriver och lämnar.', expect: '—', checks: [] },
    ],
    materials: [{ h: 'Sentences for the board', body: 'Complete with past perfect:\n\n1. When we arrived, the film ______ (start).\n2. She was tired because she ______ (work) all day.\n3. They ______ (finish) dinner before we came.\n4. I could not get in — I ______ (lose) my key.\n5. He ______ (never / see) snow before he moved here.\n6. By the time the bus came, we ______ (wait) for an hour.\n\nThen write three sentences of your own.' }],
    tasks: [{ q: '1.', a: 'had started' }, { q: '2.', a: 'had worked' }, { q: '3.', a: 'had finished' }, { q: '4.', a: 'had lost' }, { q: '5.', a: 'had never seen' }, { q: '6.', a: 'had been waiting (had waited also accepted)' }],
    stuck: 'Ge eleven bara mening 1–3 och skriv "had" framför luckan åt dem.',
    ahead: 'Be dem skriva en kort historia på fem meningar där minst två är past perfect.',
    wrong: 'Kommer de inte igång: gör 1–3 gemensamt på tavlan. Blir det stökigt: tyst skrivande, samla in efter tio minuter, rätta gemensamt.',
    exit: { q: 'Write one sentence using past perfect.', a: 'Any correct "had + past participle" sentence.' },
    handover: 'Vi hann alla sex plus egna meningar. Flera blandar ihop andra och tredje verbformen.',
  },
  en: {
    title: 'Past perfect — telling a story',
    curriculum: 'Lgr22, English — Speaking, writing and conversing: strategies for linguistic accuracy.',
    goal: 'I can use the past perfect to show what happened first.',
    criteria: ['I know when the past perfect is used', 'I can form had + past participle', 'I can write sentences mixing past simple and past perfect'],
    summary: 'Pupils revise the past perfect and write sentences of their own. You do not need to know English grammar — the rule and every answer are below.',
    board: "Today's goal\nUse past perfect to show what happened FIRST\n\nhad + past participle\n\n\"When I arrived, the train had left.\"\n   (2nd)                (1st)",
    need: 'Whiteboard and pen.',
    fallback: 'No technology needed.',
    phases: [
      { n: 'Warm-up', say: '"Listen to these two sentences. Which thing happened first? I will ask four of you — no hands."', pupils: 'Answer out loud.', expect: 'Whatever is in the past perfect happened first. Common mistake: assuming the order in the sentence is the order in time.', checks: [{ q: '"When she called, he had gone out." Who acted first?', a: 'He went out first.' }] },
      { n: 'Rule and examples', say: '"The rule is on the board. Had plus the third form. Go — eat — see. What are the third forms?"', pupils: 'Answer: gone, eaten, seen. Write them up.', expect: 'Some will say "went" instead of "gone". Say: "That is the second form. We need the third."', checks: [{ q: 'Third form of "write"?', a: 'Written.' }] },
      { n: 'Written practice', say: '"Write the six sentences from the board in your notebook. Then write three of your own."', pupils: 'Write individually.', expect: 'Sentences 5 and 6 are the hardest. Ask: "Which one happened first?"', checks: [] },
      { n: 'Close', say: '"Write the exit question on a slip and hand it to me on your way out."', pupils: 'Write and hand in.', expect: '—', checks: [] },
    ],
    materials: [{ h: 'Sentences for the board', body: 'Complete with past perfect:\n\n1. When we arrived, the film ______ (start).\n2. She was tired because she ______ (work) all day.\n3. They ______ (finish) dinner before we came.\n4. I could not get in — I ______ (lose) my key.\n5. He ______ (never / see) snow before he moved here.\n6. By the time the bus came, we ______ (wait) for an hour.\n\nThen write three sentences of your own.' }],
    tasks: [{ q: '1.', a: 'had started' }, { q: '2.', a: 'had worked' }, { q: '3.', a: 'had finished' }, { q: '4.', a: 'had lost' }, { q: '5.', a: 'had never seen' }, { q: '6.', a: 'had been waiting (had waited also accepted)' }],
    stuck: 'Give the pupil only sentences 1–3 and write "had" in front of the gap for them.',
    ahead: 'Ask them to write a five-sentence story with at least two past perfects in it.',
    wrong: 'If they will not start: do 1–3 together on the board. If it gets noisy: silent writing, collect after ten minutes, mark it together.',
    exit: { q: 'Write one sentence using past perfect.', a: 'Any correct "had + past participle" sentence.' },
    handover: 'We got through all six plus their own sentences. Several confuse the second and third verb forms.',
  },
}

// ── Practical subjects, run as theory ────────────────────────
const PRACTICAL: Pair = {
  shares: [10, 20, 40, 10],
  sv: {
    title: 'Teorilektion — skiss och materiallära',
    curriculum: 'Lgr22 — slöjdens och de praktiska ämnenas arbetsprocesser: idéutveckling och dokumentation.',
    goal: 'Jag kan skissa mitt arbete och motivera mitt materialval.',
    criteria: ['Jag kan rita en skiss med mått', 'Jag kan nämna två egenskaper hos mitt material', 'Jag kan förklara varför jag valt det'],
    summary: 'Teorilektion. Inga maskiner, inga verktyg framme. Eleverna skissar och dokumenterar sina pågående arbeten.',
    board: 'Dagens mål\nSkiss med mått · Motivera materialval\n\n1. Rita uppifrån och från sidan\n2. Skriv måtten i mm\n3. Vilket material? Varför?',
    need: 'Papper, blyerts, linjal. Maskiner och verktyg ska vara inlåsta eller avstängda.',
    fallback: 'Saknas linjaler går det bra på frihand med måtten utskrivna.',
    phases: [
      { n: 'Ramar och säkerhet', say: '"Ingen rör en maskin idag. Ingen går in i maskinrummet. Det är inte förhandlingsbart — jag kan inte er verkstad och kan inte hålla er säkra där inne."', pupils: 'Lyssnar och sätter sig vid bänkarna.', expect: 'Någon säger "men vi brukar få". Svara: "Inte idag. Er ordinarie lärare är tillbaka imorgon."', checks: [] },
      { n: 'Skiss', say: '"Rita ditt pågående arbete. Två vyer — uppifrån och från sidan. Skriv måtten i millimeter."', pupils: 'Ritar enskilt.', expect: 'Många ritar utan mått. Fråga: "Hur brett är det här, i millimeter?"', checks: [{ q: 'Varför ritar man två vyer?', a: 'För att man inte ser djupet uppifrån.' }] },
      { n: 'Materiallära', say: '"Skriv tre meningar: vilket material, två egenskaper, och varför du valde det."', pupils: 'Skriver enskilt.', expect: 'Egenskaper de brukar nämna: hårdhet, vikt, hur det känns, om det går att böja. Allt rimligt godkänns.', checks: [] },
      { n: 'Avslut', say: '"Lämna in skissen med ditt namn på. Städa bänken."', pupils: 'Lämnar in och städar.', expect: '—', checks: [] },
    ],
    materials: [{ h: 'Frågor att skriva upp', body: '1. Rita ditt arbete uppifrån och från sidan.\n2. Skriv måtten i mm.\n3. Vilket material har du valt?\n4. Nämn två egenskaper hos materialet.\n5. Varför passar det till just ditt arbete?' }],
    tasks: [{ q: 'Två egenskaper hos furu', a: 'Mjukt att bearbeta, ljust, relativt lätt. Alla rimliga svar godkänns.' }, { q: 'Varför mäter man i mm?', a: 'Precision — i slöjden räknas millimetern.' }],
    stuck: 'Låt eleven rita av något som redan finns i salen och skriva måtten på det.',
    ahead: 'Be dem rita en sprängskiss — alla delar isär, med namn på varje del.',
    wrong: 'Vägrar de sitta still: samla in skisserna efter 20 minuter och avsluta med gemensam genomgång av materialegenskaper på tavlan. Släpp aldrig fram någon till maskinerna.',
    exit: { q: 'Vilket material har du valt och varför?', a: 'En mening räcker. Alla motiverade svar godkänns.' },
    handover: 'Teorilektion körd — inga maskiner användes. Skisser inlämnade. Några blev irriterade över att inte få slöjda.',
  },
  en: {
    title: 'Theory lesson — sketching and materials',
    curriculum: 'Lgr22 — working processes in craft and the practical subjects: developing and documenting ideas.',
    goal: 'I can sketch my project and justify my choice of material.',
    criteria: ['I can draw a sketch with measurements', 'I can name two properties of my material', 'I can explain why I chose it'],
    summary: 'A theory lesson. No machines, no tools out. Pupils sketch and document the projects they already have running.',
    board: "Today's goal\nSketch with measurements · Justify the material\n\n1. Draw it from above and from the side\n2. Write the measurements in mm\n3. Which material? Why?",
    need: 'Paper, pencil, ruler. Machines and tools must be locked away or switched off.',
    fallback: 'If there are no rulers, freehand is fine as long as the measurements are written on.',
    phases: [
      { n: 'Ground rules and safety', say: '"Nobody touches a machine today. Nobody goes into the machine room. That is not up for discussion — I do not know your workshop and I cannot keep you safe in there."', pupils: 'Listen and sit down at the benches.', expect: 'Someone will say "but we are normally allowed". Answer: "Not today. Your own teacher is back tomorrow."', checks: [] },
      { n: 'Sketching', say: '"Draw the project you are working on. Two views — from above and from the side. Write the measurements in millimetres."', pupils: 'Draw individually.', expect: 'Many draw without measurements. Ask: "How wide is this, in millimetres?"', checks: [{ q: 'Why do we draw two views?', a: 'Because you cannot see the depth from above.' }] },
      { n: 'Materials', say: '"Write three sentences: which material, two properties, and why you chose it."', pupils: 'Write individually.', expect: 'Properties they usually name: hardness, weight, how it feels, whether it bends. Anything reasonable is accepted.', checks: [] },
      { n: 'Close', say: '"Hand in your sketch with your name on it. Tidy your bench."', pupils: 'Hand in and tidy.', expect: '—', checks: [] },
    ],
    materials: [{ h: 'Questions to write on the board', body: '1. Draw your project from above and from the side.\n2. Write the measurements in mm.\n3. Which material have you chosen?\n4. Name two properties of that material.\n5. Why does it suit your project?' }],
    tasks: [{ q: 'Two properties of pine', a: 'Soft to work, pale, fairly light. Any reasonable answer is accepted.' }, { q: 'Why measure in mm?', a: 'Precision — in craft the millimetre counts.' }],
    stuck: 'Let the pupil draw something already in the room and write its measurements instead.',
    ahead: 'Ask them to draw an exploded view — every part separated, each one named.',
    wrong: 'If they refuse to settle: collect the sketches after 20 minutes and finish with a whole-class run-through of material properties on the board. Never let anyone near the machines.',
    exit: { q: 'Which material have you chosen and why?', a: 'One sentence is enough. Any justified answer is accepted.' },
    handover: 'Theory lesson done — no machines were used. Sketches handed in. A few were annoyed at not doing practical work.',
  },
}

const PRACTICAL_SUBJECTS = ['Slöjd', 'Hem- och konsumentkunskap', 'Idrott och hälsa', 'Bild', 'Musik']

function pick(subject: string, lessonType?: string): Pair {
  const s = (subject || '').toLowerCase()
  const isPractical = PRACTICAL_SUBJECTS.some((p) => s.includes(p.toLowerCase().slice(0, 5)))
  const theory = /teori|theory/i.test(lessonType || '')
  if (isPractical && theory) return PRACTICAL
  if (s.includes('matemat') || s.includes('mathemat')) return MA
  if (s.includes('engelsk') || s.includes('english')) return EN
  if (s.includes('svensk') || s.includes('swedish')) return SV
  if (isPractical) return PRACTICAL
  return SV
}

const FIRST90 = {
  sv: (subject: string) => [
    'Stå vid dörren. Säg god morgon till varje elev som kommer in.',
    'Skriv ditt namn på tavlan innan lektionen börjar.',
    `Säg: "Jag heter [ditt namn] och jag är här idag. Vi ska jobba med ${subject}. Ni sitter där ni brukar sitta."`,
    'Ta närvaro högt från listan. Det tar 60 sekunder och sätter tonen.',
  ],
  en: (subject: string) => [
    'Stand at the door. Say good morning to every pupil who comes in.',
    'Write your name on the board before the lesson starts.',
    `Say: "My name is [your name] and I am here today. We are working on ${subject}. Sit where you normally sit."`,
    'Take the register out loud from the list. It takes 60 seconds and sets the tone.',
  ],
}

export function cannedPlan(r: Record<string, unknown>) {
  const lang = (r.language as string) === 'en' ? 'en' : 'sv'
  const pair = pick(r.subject as string, r.lesson_type as string)
  const tpl = pair[lang]
  const start = (r.starts_at as string) ?? '08:00'
  const minutes = Number(r.minutes) || 60
  const times = schedule(start, minutes, pair.shares)
  const topic = (r.topic as string)?.trim()
  const notes = (r.notes as string)?.trim()

  return {
    title: topic ? `${tpl.title} — ${topic}` : tpl.title,
    curriculum: tpl.curriculum,
    goal: tpl.goal,
    criteria: tpl.criteria,
    readTime: `${Math.max(2, Math.round(minutes / 20))} min`,
    summary: tpl.summary + (notes
      ? (lang === 'en' ? ` The school notes: ${notes}` : ` Skolans anteckning: ${notes}`)
      : ''),
    first90: FIRST90[lang](String(r.subject ?? '')),
    board: tpl.board,
    equipment: { need: tpl.need, fallback: tpl.fallback },
    phases: tpl.phases.map((p, i) => ({ t: times[i], n: p.n, say: p.say, pupils: p.pupils, expect: p.expect, checks: p.checks })),
    materials: tpl.materials,
    tasks: tpl.tasks,
    stuck: tpl.stuck,
    ahead: tpl.ahead,
    wrong: tpl.wrong,
    exit: tpl.exit,
    handover: tpl.handover,
    language: lang,
  }
}

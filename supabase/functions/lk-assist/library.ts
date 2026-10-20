// Written in-lesson help, served while no model is configured.
//
// An honest limit: without a model this cannot invent subject content, so it
// does not pretend to. What it gives instead is a concrete TEACHING MOVE the
// substitute can apply to whatever is already on the board - real technique,
// executable with no subject knowledge, rather than fake subject detail.
// The UI badges these as written so nobody mistakes one for generated content.

import type { AssistReq, Extra, ExtraPair } from './types.ts'

type Pair = { sv: Extra; en: Extra }

// ── Explain it another way ───────────────────────────────────
// Concrete -> picture -> symbols, which is the route a plan's first
// explanation usually skips.
const EXPLAIN: Pair = {
  sv: {
    title: 'Förklara en gång till — en annan väg in',
    lines: [
      'Säg: "Vi tar det en gång till, men på ett helt annat sätt. Glöm vad som står."',
      'Börja med något fysiskt i rummet: pennor, stolar, fingrar, en ritning på tavlan. Visa idén med saker innan du använder orden.',
      'Rita det sedan på tavlan. Säg vad du gör medan du ritar: "Jag ritar en ruta här, och den delar jag i tre."',
      'Skriv först nu upp det med siffror eller ord, och peka tillbaka på ritningen för varje del.',
      'Gör ett exempel själv, högt, hela vägen till svaret. Gör sedan nästa exempel tillsammans med klassen.',
      'Säg: "Vänd dig till den som sitter närmast och förklara det för hen med dina egna ord." Lyssna på två par och plocka upp det som låter fel.',
    ],
    board: 'SAMMA SAK, NY VÄG\n\n1. Med saker   →  2. Som bild  →  3. Med siffror\n\n(Rita steg 2 stort. Låt den stå kvar hela lektionen.)',
    minutes: 8,
  },
  en: {
    title: 'Explain it again — a different route in',
    lines: [
      'Say: "We are going to do this again, a completely different way. Forget what is written down."',
      'Start with something physical in the room: pens, chairs, fingers, a drawing on the board. Show the idea with objects before you use the words.',
      'Then draw it on the board. Say what you are doing as you draw: "I am drawing a box here, and I am splitting it into three."',
      'Only now write it with numbers or words, pointing back at the drawing for each part.',
      'Work one example yourself, out loud, all the way to the answer. Then do the next one together with the class.',
      'Say: "Turn to the person next to you and explain it to them in your own words." Listen in on two pairs and pick up anything that sounds wrong.',
    ],
    board: 'SAME THING, NEW ROUTE\n\n1. With objects  →  2. As a picture  →  3. With numbers\n\n(Draw step 2 large. Leave it up for the rest of the lesson.)',
    minutes: 8,
  },
}

// ── Another exercise on this part ────────────────────────────
const EXERCISE: Pair = {
  sv: {
    title: 'Mer övning på just den här delen',
    lines: [
      'Ta uppgiften som klassen just gjorde och ändra bara siffrorna eller orden. Samma typ, nytt innehåll. Skriv upp fyra sådana på tavlan.',
      'Säg: "Jag gör den första på tavlan. Ni gör resten."',
      'Gör uppgift 1 högt, hela vägen, och skriv varje steg.',
      'Gör uppgift 2 tillsammans: du frågar "vad gör jag nu?" och klassen svarar.',
      'Uppgift 3 och 4 gör de själva. Gå runt och titta i blocken — säg inte svaret, fråga "vad var första steget?".',
      'Avsluta med att två elever får komma fram och göra 3 och 4 på tavlan.',
    ],
    board: 'ÖVNING\n\n1.  (som den vi gjorde — jag visar)\n2.  (samma, nya siffror — vi gör den ihop)\n3.  (samma — du gör själv)\n4.  (samma — du gör själv)',
    minutes: 12,
  },
  en: {
    title: 'More practice on this part',
    lines: [
      'Take the task the class just did and change only the numbers or the words. Same type, new content. Write four of them on the board.',
      'Say: "I will do the first one on the board. You do the rest."',
      'Work task 1 out loud, all the way, writing every step.',
      'Do task 2 together: you ask "what do I do now?" and the class answers.',
      'They do 3 and 4 on their own. Walk round and look in their books — do not give the answer, ask "what was the first step?".',
      'Finish by sending two pupils to the board to do 3 and 4.',
    ],
    board: 'PRACTICE\n\n1.  (like the one we did — I show you)\n2.  (same, new numbers — we do it together)\n3.  (same — on your own)\n4.  (same — on your own)',
    minutes: 12,
  },
}

// ── Easier ───────────────────────────────────────────────────
const EASIER: Pair = {
  sv: {
    title: 'Lättare väg in',
    lines: [
      'Säg: "Vi backar ett steg. Jag vill att alla är med."',
      'Hitta det enklaste fallet av samma sak — det som är nästan självklart. Skriv upp det och lös det tillsammans på tavlan.',
      'Ta sedan ett steg upp: samma uppgift med ett litet tillägg. Lös den tillsammans igen.',
      'Nu först: samma uppgift som klassen fastnade på. Peka tillbaka på de två stegen medan du löser den.',
      'Låt dem göra en egen av varje nivå. Den som bara klarar nivå 1 jobbar vidare där — det är helt i sin ordning i dag.',
      'Gå runt och säg vad som är rätt, inte bara vad som är fel: "Första steget stämmer. Fortsätt."',
    ],
    board: 'STEG FÖR STEG\n\nNivå 1  (nästan självklart — vi gör den ihop)\nNivå 2  (ett steg till — vi gör den ihop)\nNivå 3  (den vi fastnade på)',
    minutes: 12,
  },
  en: {
    title: 'An easier way in',
    lines: [
      'Say: "We are going back a step. I want everyone with me."',
      'Find the simplest case of the same thing — the one that is almost obvious. Write it up and solve it together on the board.',
      'Then go one step up: the same task with one small addition. Solve it together again.',
      'Only now: the task the class got stuck on. Point back at the two steps as you solve it.',
      'Let them do one of each level themselves. Anyone who only manages level 1 keeps working there — that is perfectly fine today.',
      'Walk round and say what is right, not only what is wrong: "Your first step is correct. Keep going."',
    ],
    board: 'STEP BY STEP\n\nLevel 1  (almost obvious — we do it together)\nLevel 2  (one step further — we do it together)\nLevel 3  (the one we got stuck on)',
    minutes: 12,
  },
}

// ── Harder ───────────────────────────────────────────────────
const HARDER: Pair = {
  sv: {
    title: 'Svårare version av samma sak',
    lines: [
      'Säg: "Det här satt. Nu gör vi det svårare — samma sak, men ni får tänka mer."',
      'Vänd på uppgiften: ge svaret och låt dem hitta frågan. Skriv ett exempel på tavlan.',
      'Lägg in ett fel: skriv upp en lösning som är nästan rätt och säg "hitta felet och förklara varför det är fel".',
      'Kräv ett varför: samma uppgift som förut, men svaret ska skrivas som en mening som börjar med "Det blir så därför att…".',
      'Låt dem skriva en egen svår uppgift av samma typ och byta med bänkkamraten.',
      'Den som blir klar förklarar sin lösning för någon annan. Att förklara är svårare än att räkna.',
    ],
    board: 'SVÅRARE — SAMMA SAK\n\n1. Jag ger svaret, du hittar frågan\n2. Hitta felet i min lösning\n3. Svara med "Det blir så därför att…"\n4. Skriv en egen svår uppgift — byt med bänkkamraten',
    minutes: 12,
  },
  en: {
    title: 'A harder version of the same thing',
    lines: [
      'Say: "That landed. Now we make it harder — the same thing, but you have to think more."',
      'Turn the task round: give the answer and let them find the question. Write an example on the board.',
      'Plant an error: write up a solution that is nearly right and say "find the mistake and explain why it is wrong".',
      'Demand a why: the same task as before, but the answer must be written as a sentence starting "This happens because…".',
      'Let them write a hard task of the same type themselves and swap with the person next to them.',
      'Anyone who finishes explains their solution to someone else. Explaining is harder than solving.',
    ],
    board: 'HARDER — SAME THING\n\n1. I give the answer, you find the question\n2. Find the mistake in my solution\n3. Answer with "This happens because…"\n4. Write your own hard task — swap with your neighbour',
    minutes: 12,
  },
}

// ── Fill the time left ───────────────────────────────────────
function filler(minutes: number): Pair {
  if (minutes <= 5) {
    return {
      sv: {
        title: `Fyll ${minutes} minuter — tre saker`,
        lines: [
          'Säg: "Allt ner. Papper fram. Tre saker du minns från lektionen, egna ord, en mening var."',
          'Låt dem skriva tyst i två minuter.',
          'Fråga fyra elever, en sak var. Skriv upp svaren på tavlan.',
          'Samla in lapparna när de går — de är värda mer till ordinarie lärare än något du kan skriva i överlämningen.',
        ],
        board: 'TRE SAKER DU MINNS\n\n1.\n2.\n3.\n\n(Egna ord. En mening var. Lämna lappen när du går.)',
        minutes,
      },
      en: {
        title: `Fill ${minutes} minutes — three things`,
        lines: [
          'Say: "Everything down. Paper out. Three things you remember from the lesson, your own words, one sentence each."',
          'Let them write in silence for two minutes.',
          'Ask four pupils, one thing each. Write the answers on the board.',
          'Collect the slips as they leave — they are worth more to the class teacher than anything you can write in the handover.',
        ],
        board: 'THREE THINGS YOU REMEMBER\n\n1.\n2.\n3.\n\n(Your own words. One sentence each. Hand it in on your way out.)',
        minutes,
      },
    }
  }
  if (minutes <= 12) {
    return {
      sv: {
        title: `Fyll ${minutes} minuter — förklara för varandra`,
        lines: [
          'Dela klassen i par. Säg: "En av er förklarar lektionen för den andra. Ni får två minuter. Sedan byter ni."',
          'Ta tiden högt. Säg "byt" efter två minuter.',
          'Fråga sedan: "Vad var svårast att förklara?" Skriv upp det som kommer på tavlan — det är exakt det ordinarie lärare behöver veta.',
          'Avsluta med en snabb runda: varje par säger en sak de blev säkra på.',
        ],
        board: 'FÖRKLARA FÖR VARANDRA\n\n2 min — A förklarar, B lyssnar\n2 min — B förklarar, A lyssnar\n\nSedan: vad var svårast att förklara?',
        minutes,
      },
      en: {
        title: `Fill ${minutes} minutes — explain it to each other`,
        lines: [
          'Put the class in pairs. Say: "One of you explains the lesson to the other. You have two minutes. Then you swap."',
          'Time it out loud. Say "swap" after two minutes.',
          'Then ask: "What was hardest to explain?" Write what comes up on the board — that is exactly what the class teacher needs to know.',
          'Finish with a quick round: each pair says one thing they now feel sure about.',
        ],
        board: 'EXPLAIN IT TO EACH OTHER\n\n2 min — A explains, B listens\n2 min — B explains, A listens\n\nThen: what was hardest to explain?',
        minutes,
      },
    }
  }
  return {
    sv: {
      title: `Fyll ${minutes} minuter — eleverna gör provfrågorna`,
      lines: [
        'Säg: "Ni ska skriva frågorna som ordinarie lärare kan använda på ett prov om det här."',
        'Varje elev skriver tre frågor OCH svaren. Det är svaren som är jobbet.',
        'Efter sex minuter: byt papper med bänkkamraten och svara på varandras frågor.',
        'Lämna sedan tillbaka och rätta mot varandras svar. Säg: "Är ni oeniga, skriv båda svaren."',
        'Ta upp två oenigheter gemensamt på tavlan. Det är där missförstånden sitter.',
        'Samla in allt. Skriv i överlämningen vilka frågor klassen inte kunde svara på.',
      ],
      board: 'SKRIV PROVET\n\n1. Tre frågor om lektionen — med svar\n2. Byt med bänkkamraten, svara på deras\n3. Byt tillbaka, rätta\n4. Oeniga? Skriv båda svaren',
      minutes,
    },
    en: {
      title: `Fill ${minutes} minutes — pupils write the test`,
      lines: [
        'Say: "You are going to write the questions the class teacher could use on a test about this."',
        'Each pupil writes three questions AND the answers. The answers are the work.',
        'After six minutes: swap papers with your neighbour and answer each other’s questions.',
        'Then swap back and mark against each other’s answers. Say: "If you disagree, write both answers."',
        'Take two disagreements together on the board. That is where the misunderstandings are.',
        'Collect it all in. Note in the handover which questions the class could not answer.',
      ],
      board: 'WRITE THE TEST\n\n1. Three questions about the lesson — with answers\n2. Swap with your neighbour, answer theirs\n3. Swap back, mark it\n4. Disagree? Write both answers',
      minutes,
    },
  }
}

function pickPair(r: AssistReq): Pair {
  switch (r.kind) {
    case 'exercise': return EXERCISE
    case 'level':    return r.variant === 'harder' ? HARDER : EASIER
    case 'filler':   return filler(Math.max(2, Math.min(30, r.minutes_left ?? 10)))
    default:         return EXPLAIN
  }
}

export function writtenExtra(r: AssistReq): Extra {
  return pickPair(r)[r.language === 'en' ? 'en' : 'sv']
}

/** Both languages. Free here - the library already holds the pair. */
export function writtenPair(r: AssistReq): ExtraPair {
  const lang = r.language === 'en' ? 'en' : 'sv'
  const alt = lang === 'en' ? 'sv' : 'en'
  const pair = pickPair(r)
  return { language: lang, extra: pair[lang], language_alt: alt, extra_alt: pair[alt] }
}

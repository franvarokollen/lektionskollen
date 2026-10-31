// © 2026 Frånvarokollen Sverige AB. All rights reserved. Proprietary and confidential: see LICENSE.
/* ── Subject and year, in the reader's language ──────────
   The timetable is Swedish and always will be: "Ma", "Tb7a" and "Svenska" are
   what Frånvarokollen imports and what the plan row stores. Only the display
   switches, so the stored value stays the one the school recognises and
   nothing needs migrating when a new subject appears — an unknown subject
   simply shows as written. */
import { LANG, StrMap } from './lk-core';
const SUBJECTS_EN: StrMap = {
  'Matematik': 'Mathematics', 'Svenska': 'Swedish', 'Engelska': 'English',
  'Biologi': 'Biology', 'Fysik': 'Physics', 'Kemi': 'Chemistry',
  'Historia': 'History', 'Geografi': 'Geography', 'Samhällskunskap': 'Civics',
  'Religionskunskap': 'Religious education', 'Idrott': 'PE', 'Idrott och hälsa': 'PE',
  'Slöjd': 'Craft and design', 'Teknik': 'Design and technology',
  'Musik': 'Music', 'Bild': 'Art', 'Hem- och konsumentkunskap': 'Home economics',
  'Moderna språk': 'Modern languages', 'Spanska': 'Spanish', 'Tyska': 'German',
  'Franska': 'French', 'NO': 'Science', 'SO': 'Humanities',
  'Svenska som andraspråk': 'Swedish as a second language', 'Modersmål': 'Mother tongue tuition',
  'Teckenspråk för hörande': 'Sign language', 'Elevens val': "Pupil's choice",
};

/* ── Every year and subject a school can teach, F to Åk 9 ──
   The pickers used to be built from whatever plans already existed, so a
   school could not plan a subject or a year nobody had yet made a cover
   lesson for. These are the grundskola's own (Skolverket, LGR22), spelled the
   way the database stores them. The database folds the common alternative
   spellings into these (lektionskollen.canon_subject). Gymnasiet is not here
   on purpose: it needs its own programme and course structure. */
export const CATALOG_YEARS = ['F', 'Åk 1', 'Åk 2', 'Åk 3', 'Åk 4', 'Åk 5', 'Åk 6', 'Åk 7', 'Åk 8', 'Åk 9'];
export const CATALOG_SUBJECTS = [
  'Matematik', 'Svenska', 'Svenska som andraspråk', 'Engelska', 'Moderna språk',
  'Biologi', 'Fysik', 'Kemi', 'Teknik', 'Geografi', 'Historia', 'Religionskunskap',
  'Samhällskunskap', 'Idrott och hälsa', 'Musik', 'Bild', 'Slöjd',
  'Hem- och konsumentkunskap', 'Modersmål', 'Teckenspråk för hörande',
];
const SUBJECT_ALIAS: StrMap = {
  'idrott': 'Idrott och hälsa', 'hemkunskap': 'Hem- och konsumentkunskap',
  'hkk': 'Hem- och konsumentkunskap', 'sva': 'Svenska som andraspråk',
  'religion': 'Religionskunskap',
};
/** The same folding the database does, so a list never shows both spellings. */
export function canonSubject(s: unknown) {
  const k = String(s || '').trim();
  return SUBJECT_ALIAS[k.toLowerCase()] || k;
}
export function canonYear(y: unknown) {
  const k = String(y || '').trim();
  if (/^(f|fsk|f-klass|förskoleklass|forskoleklass)$/i.test(k)) return 'F';
  const m = /^(?:åk|ak|årskurs)\s*(\d+)$/i.exec(k);
  return m ? 'Åk ' + m[1] : k;
}

export function subjectLabel(s: string | undefined) {
  if (LANG !== 'en' || !s) return s || '';
  return SUBJECTS_EN[s] || s;
}

/** "Åk 7" is the Swedish school year. English readers get "Year 7". */
export function yearLabel(y: string | undefined) {
  if (y === 'F') return LANG === 'en' ? 'Preschool class' : 'Förskoleklass';
  if (LANG !== 'en' || !y) return y || '';
  const m = /^\s*Åk\s*(\d+)/.exec(y);
  return m ? 'Year ' + m[1] : y;
}


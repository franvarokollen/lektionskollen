// src/lib/lektionskollen/lesson-to-request.ts
//
// The whole contract between Frånvarokollen and Lektionskollen, in one pure
// function. A cover row goes in, the panel's query string comes out.
//
// PURITY: zero imports, no DOM, no clock. The caller owns the staff list and
// resolves display names, exactly as notify-email.ts expects of its callers.
//
// WHAT MAY CROSS: subject, year group, class group, length, times, room, the
// absent teacher's display name, the substitute's display name, and the cover
// key. Nothing about a pupil crosses, now or later — the parameter list below
// is the enforcement, so adding to it is a decision, not an accident.

export interface CoverLessonFacts {
  /** Frånvarokollen's own key for the cover; how the plan is found again. */
  lessonKey: string
  subject: string
  /** Class group as the timetable writes it, e.g. "Tb7a". */
  group: string
  room?: string | null
  startTime: string
  endTime: string
  length: number
  /** Resolved display name, not a staff code. */
  absentTeacherName: string
  /** Resolved display name of the substitute, once one is assigned. */
  coverName?: string | null
  /** Timetable subject code, kept so the plan can show what it derived from. */
  subjectCode?: string | null
  /** Slöjd, idrott, lab — a substitute cannot run these as written. */
  practical?: boolean
}

export interface PanelParams {
  lang: 'sv' | 'en'
  /** Year group, derived by the caller from the class group. */
  yearGroup: string
}

/**
 * The panel URL for one cover row. `base` is the Lektionskollen deployment,
 * e.g. https://franvarokollen.github.io/lektionskollen/app/
 */
export function panelUrl(base: string, lesson: CoverLessonFacts, p: PanelParams): string {
  const root = base.endsWith('/') ? base : base + '/'
  const q = new URLSearchParams({ embed: '1', lang: p.lang, ref: lesson.lessonKey })
  const put = (k: string, v: string | number | null | undefined) => {
    if (v !== null && v !== undefined && String(v) !== '') q.set(k, String(v))
  }
  put('subject', lesson.subject)
  put('code', lesson.subjectCode)
  put('year', p.yearGroup)
  put('group', lesson.group)
  put('mins', lesson.length)
  put('start', lesson.startTime)
  put('end', lesson.endTime)
  put('room', lesson.room)
  put('teacher', lesson.absentTeacherName)
  put('cover', lesson.coverName)
  if (lesson.practical) q.set('practical', '1')
  return root + 'index.html?' + q.toString()
}

/**
 * Year group from a class group, Frånvarokollen's own convention: the digits
 * that follow the school prefix. "Tb7a" -> "Åk 7". Unreadable groups return an
 * empty string rather than a guess — the coordinator can pick it in the panel.
 */
export function yearFromGroup(group: string, lang: 'sv' | 'en' = 'sv'): string {
  const m = /(\d{1,2})/.exec(group || '')
  if (!m) return ''
  const n = Number(m[1])
  if (!Number.isFinite(n) || n < 1 || n > 12) return ''
  return (lang === 'sv' ? 'Åk ' : 'Year ') + n
}

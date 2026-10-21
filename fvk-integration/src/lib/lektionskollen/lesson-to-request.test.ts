import { describe, expect, it } from 'vitest'
import { panelUrl, yearFromGroup, type CoverLessonFacts } from './lesson-to-request'

const BASE = 'https://franvarokollen.github.io/lektionskollen/app/'

function lesson(overrides: Partial<CoverLessonFacts> = {}): CoverLessonFacts {
  return {
    lessonKey: 'L-2026-10-21-3',
    subject: 'Matematik',
    group: 'Tb7a',
    room: 'A101',
    startTime: '09:00',
    endTime: '09:45',
    length: 45,
    absentTeacherName: 'A. Teacher',
    ...overrides,
  }
}

describe('yearFromGroup', () => {
  it('reads the year out of a class group', () => {
    expect(yearFromGroup('Tb7a')).toBe('Åk 7')
    expect(yearFromGroup('Tb5c')).toBe('Åk 5')
  })

  it('speaks English when asked', () => {
    expect(yearFromGroup('Tb9a', 'en')).toBe('Year 9')
  })

  it('returns empty rather than guessing', () => {
    expect(yearFromGroup('')).toBe('')
    expect(yearFromGroup('Arbetstid')).toBe('')
    expect(yearFromGroup('Tb99x')).toBe('')
  })
})

describe('panelUrl', () => {
  it('carries the lesson facts the plan needs', () => {
    const u = new URL(panelUrl(BASE, lesson(), { lang: 'sv', yearGroup: 'Åk 7' }))
    expect(u.searchParams.get('embed')).toBe('1')
    expect(u.searchParams.get('ref')).toBe('L-2026-10-21-3')
    expect(u.searchParams.get('subject')).toBe('Matematik')
    expect(u.searchParams.get('group')).toBe('Tb7a')
    expect(u.searchParams.get('year')).toBe('Åk 7')
    expect(u.searchParams.get('mins')).toBe('45')
    expect(u.searchParams.get('room')).toBe('A101')
    expect(u.searchParams.get('lang')).toBe('sv')
  })

  it('omits empty values instead of sending blanks', () => {
    const u = new URL(
      panelUrl(BASE, lesson({ room: null, coverName: '' }), { lang: 'sv', yearGroup: 'Åk 7' }),
    )
    expect(u.searchParams.has('room')).toBe(false)
    expect(u.searchParams.has('cover')).toBe(false)
  })

  it('passes the substitute once one is assigned', () => {
    const u = new URL(
      panelUrl(BASE, lesson({ coverName: 'B. Substitute' }), { lang: 'sv', yearGroup: 'Åk 7' }),
    )
    expect(u.searchParams.get('cover')).toBe('B. Substitute')
  })

  it('flags a practical lesson so the plan warns about it', () => {
    const u = new URL(
      panelUrl(BASE, lesson({ practical: true }), { lang: 'sv', yearGroup: 'Åk 8' }),
    )
    expect(u.searchParams.get('practical')).toBe('1')
  })

  it('tolerates a base with or without a trailing slash', () => {
    const a = panelUrl(BASE, lesson(), { lang: 'sv', yearGroup: 'Åk 7' })
    const b = panelUrl(BASE.slice(0, -1), lesson(), { lang: 'sv', yearGroup: 'Åk 7' })
    expect(a).toBe(b)
  })

  it('never sends anything beyond the declared contract', () => {
    const u = new URL(panelUrl(BASE, lesson({ coverName: 'B. Substitute', subjectCode: 'Ma', practical: true }), { lang: 'en', yearGroup: 'Year 7' }))
    expect([...u.searchParams.keys()].sort()).toEqual(
      ['code', 'cover', 'embed', 'end', 'group', 'lang', 'mins', 'practical', 'ref', 'room', 'start', 'subject', 'teacher', 'year'].sort(),
    )
  })
})

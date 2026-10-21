import { describe, expect, it } from 'vitest'
import { planEmailLine } from './plan-email-line'

const url = 'https://example.test/lektionskollen/app/plan.html?t=abc123'

describe('planEmailLine', () => {
  it('writes the Swedish paragraph with the link', () => {
    const out = planEmailLine({ sv: true, url, title: 'Bråk på tallinjen', approved: true })
    expect(out).toContain('Lektionsplan')
    expect(out).toContain('Bråk på tallinjen')
    expect(out).toContain(url)
    expect(out).toContain('utan inloggning')
  })

  it('writes the English paragraph', () => {
    const out = planEmailLine({ sv: false, url, title: null, approved: true })
    expect(out).toContain('Lesson plan')
    expect(out).toContain('without signing in')
    expect(out).not.toContain('null')
  })

  it('sends nothing for an unapproved plan', () => {
    expect(planEmailLine({ sv: true, url, title: 'x', approved: false })).toBe('')
  })

  it('sends nothing without a link', () => {
    expect(planEmailLine({ sv: true, url: '', title: 'x', approved: true })).toBe('')
  })

  it('collapses cleanly when there is no title', () => {
    const out = planEmailLine({ sv: true, url, approved: true })
    expect(out).not.toMatch(/\n\n\n/)
  })
})

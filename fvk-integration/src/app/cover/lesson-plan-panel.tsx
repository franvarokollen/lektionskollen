'use client'

// src/app/cover/lesson-plan-panel.tsx
//
// Lektionskollen in a side panel, over the cover screen. An iframe rather than
// a port of the plan UI: the add-on ships on its own cadence, and a plan fix
// should not need a Frånvarokollen deploy. The seam is postMessage, so when the
// panel earns a native rewrite the surrounding code does not change.

import { useEffect, useRef } from 'react'
import { lektionskollenBase } from '@/lib/lektionskollen/client'
import {
  panelUrl,
  yearFromGroup,
  type CoverLessonFacts,
} from '@/lib/lektionskollen/lesson-to-request'

interface Props {
  lesson: CoverLessonFacts
  lang: 'sv' | 'en'
  onClose: () => void
  /** Fired when a plan is approved inside the panel. */
  onPlan?: (p: { planId: string; url: string | null; title: string | null }) => void
}

export default function LessonPlanPanel({ lesson, lang, onClose, onPlan }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const src = panelUrl(lektionskollenBase(), lesson, {
    lang,
    yearGroup: yearFromGroup(lesson.group, lang),
  })

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { source?: string; type?: string } | null
      if (!d || d.source !== 'lektionskollen') return
      if (d.type === 'lk:close') onClose()
      if (d.type === 'lk:plan') {
        const m = e.data as { planId: string; url: string | null; title: string | null }
        onPlan?.({ planId: m.planId, url: m.url, title: m.title })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onClose, onPlan])

  // Escape closes, matching every other panel on the cover screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={lang === 'sv' ? 'Lektionsplan' : 'Lesson plan'}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[720px] flex-col bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {[lesson.group, lesson.subject].filter(Boolean).join(' ')}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {lesson.startTime}–{lesson.endTime} • {lesson.length} min
              {lesson.room ? ` • ${lesson.room}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-sage-50 hover:text-foreground"
            aria-label={lang === 'sv' ? 'Stäng' : 'Close'}
          >
            ✕
          </button>
        </div>
        <iframe
          ref={frameRef}
          src={src}
          title={lang === 'sv' ? 'Lektionskollen' : 'Lektionskollen'}
          className="h-full w-full flex-1 border-0"
        />
      </div>
    </>
  )
}

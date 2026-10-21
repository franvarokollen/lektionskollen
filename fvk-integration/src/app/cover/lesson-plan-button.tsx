'use client'

// src/app/cover/lesson-plan-button.tsx
//
// The add-on's entire footprint on the cover screen: one button in the lesson
// popover. It says what the coordinator can do next, not what the feature is
// called — "Lesson plan" when there is none, "Open plan" when there is, and a
// green tick once that plan is approved and the substitute can be sent it.
//
// Hidden entirely when the add-on is off for this school, so a school without
// it sees the popover exactly as it is today.

import { useState } from 'react'
import { FEATURES } from '@/lib/config/features'
import { lektionskollenConfigured } from '@/lib/lektionskollen/client'
import { useLessonPlan } from '@/lib/lektionskollen/use-lesson-plan'
import type { CoverLessonFacts } from '@/lib/lektionskollen/lesson-to-request'
import LessonPlanPanel from './lesson-plan-panel'

interface Props {
  lesson: CoverLessonFacts
  lang: 'sv' | 'en'
  /** Past lessons are read-only on the cover screen; so is this. */
  isPast?: boolean
  /** Lets the popover drop the plan link into its notification email. */
  onPlanReady?: (p: { planId: string; url: string | null; title: string | null }) => void
}

export default function LessonPlanButton({ lesson, lang, isPast, onPlanReady }: Props) {
  const [open, setOpen] = useState(false)
  const { plan } = useLessonPlan(lesson.lessonKey)
  const sv = lang === 'sv'

  if (!FEATURES.lektionskollen || !lektionskollenConfigured()) return null

  // A historical lesson shows its plan but cannot start one.
  if (isPast && !plan) return null

  const label = !plan
    ? sv
      ? 'Lektionsplan'
      : 'Lesson plan'
    : plan.approved
      ? sv
        ? 'Öppna planen'
        : 'Open plan'
      : sv
        ? 'Planen väntar på godkännande'
        : 'Plan awaiting approval'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
          plan?.approved
            ? 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100'
            : plan
              ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
              : 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
        }`}
      >
        <span className="mr-1.5">{plan?.approved ? '✓' : '📄'}</span>
        {label}
      </button>

      {open && (
        <LessonPlanPanel
          lesson={lesson}
          lang={lang}
          onClose={() => setOpen(false)}
          onPlan={(p) => onPlanReady?.(p)}
        />
      )}
    </>
  )
}

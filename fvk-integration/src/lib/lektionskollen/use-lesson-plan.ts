'use client'

// src/lib/lektionskollen/use-lesson-plan.ts
//
// One cover row's plan: whether it exists, and what came back when the panel
// finished. Everything the popover button needs to decide what to say.

import { useCallback, useEffect, useState } from 'react'
import { planForCover, type CoverPlan } from './client'

/** What the panel posts back when a coordinator approves a plan. */
export interface PlanApprovedMessage {
  source: 'lektionskollen'
  type: 'lk:plan'
  planId: string
  ref: string | null
  shareToken: string | null
  url: string | null
  title: string | null
}

function isPanelMessage(d: unknown): d is { source: string; type: string; ref?: string | null } {
  return typeof d === 'object' && d !== null && (d as { source?: unknown }).source === 'lektionskollen'
}

export function useLessonPlan(absenceRef: string | null) {
  const [plan, setPlan] = useState<CoverPlan | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!absenceRef) return
    setLoading(true)
    try {
      setPlan(await planForCover(absenceRef))
    } finally {
      setLoading(false)
    }
  }, [absenceRef])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // The panel is an iframe, so its news arrives by message. Only this row's.
  useEffect(() => {
    if (!absenceRef) return
    const onMessage = (e: MessageEvent) => {
      if (!isPanelMessage(e.data)) return
      if (e.data.type !== 'lk:plan') return
      if (e.data.ref && e.data.ref !== absenceRef) return
      void refresh()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [absenceRef, refresh])

  return { plan, loading, refresh }
}

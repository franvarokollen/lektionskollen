// src/lib/lektionskollen/client.ts
//
// Lektionskollen lives in its own Supabase project, on purpose: the add-on has
// to be switchable per school, metered on its own, and removable without
// touching a byte of Frånvarokollen's data. The plan bank is also cross-school
// — a shared pool is a different trust boundary from Frånvarokollen's
// school-scoped RLS, and mixing the two would mean weakening one of them.
//
// Nothing here reaches past the public.lk_* functions, which are the add-on's
// only published surface.

import { createBrowserClient } from '@supabase/ssr'

/** Null when the add-on is not configured for this deployment. */
export function createLektionskollenClient() {
  const url = process.env.NEXT_PUBLIC_LEKTIONSKOLLEN_URL
  const key = process.env.NEXT_PUBLIC_LEKTIONSKOLLEN_ANON_KEY
  if (!url || !key) return null
  return createBrowserClient(url, key)
}

/** Where the panel is served from. */
export function lektionskollenBase(): string {
  return process.env.NEXT_PUBLIC_LEKTIONSKOLLEN_APP_URL || ''
}

export function lektionskollenConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_LEKTIONSKOLLEN_URL &&
      process.env.NEXT_PUBLIC_LEKTIONSKOLLEN_ANON_KEY &&
      process.env.NEXT_PUBLIC_LEKTIONSKOLLEN_APP_URL,
  )
}

export interface CoverPlan {
  id: string
  title: string
  subject: string
  year_group: string
  minutes: number
  approved: boolean
  shared: boolean
  share_token: string | null
  language: string
  created_at: string
}

// AUTH SEAM — the one thing left before production.
//
// Today the panel runs against the demo school on the anonymous key, which is
// what the prototype has always done. For live schools, Frånvarokollen mints a
// short-lived token for the Lektionskollen project and hands it over here, so
// the coordinator never signs in twice. That is a server route on this side and
// a members lookup on the other; neither changes the components below.
export async function planForCover(absenceRef: string): Promise<CoverPlan | null> {
  const sb = createLektionskollenClient()
  if (!sb) return null
  const { data, error } = await sb.rpc('lk_plan_for_cover', { p_absence_ref: absenceRef })
  if (error || !data) return null
  return data as CoverPlan
}

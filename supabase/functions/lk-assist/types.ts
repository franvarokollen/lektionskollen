// One thing a substitute pulled out of the plan mid-lesson.
export type Extra = {
  title: string
  // What the substitute does, in order. Scripted speech in quotes, same
  // convention as the plan itself.
  lines: string[]
  // Optional: what to write up, so the class has something to look at.
  board?: string
  // Optional: practice with answers. Never questions without answers -
  // the substitute may not know the subject.
  tasks?: { q: string; a: string }[]
  minutes?: number
}

export type AssistKind = 'explain' | 'exercise' | 'level' | 'filler'

/** Both languages of one extra, so the reader picks, not the generator. */
export type ExtraPair = {
  language: 'sv' | 'en'
  extra: Extra
  language_alt: 'sv' | 'en'
  extra_alt: Extra | null
}

export type AssistReq = {
  kind: AssistKind
  // 'phase:2' | 'task:3' | 'lesson'
  section_ref?: string
  // The text of the bit they pressed on, so the model knows what "this" is.
  section_label?: string
  section_text?: string
  variant?: string          // 'easier' | 'harder' | minutes for a filler
  language?: 'sv' | 'en'
  subject?: string
  year_group?: string
  topic?: string
  minutes_left?: number
  /** Skip the stored answer and make a new one. */
  fresh?: boolean
  // Which plan this extra supports, so the per-plan cap is charged to it:
  // the share token from the substitute's page, or the plan id from the
  // coordinator's preview. With neither, only the written library answers.
  token?: string
  plan_id?: string
}

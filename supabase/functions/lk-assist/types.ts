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
}

// src/lib/lektionskollen/plan-email-line.ts
//
// The lesson plan's line in the cover notification. The substitute already gets
// an email naming the lesson; the plan belongs in that email, not in a second
// one they have to go looking for.
//
// PURITY: zero imports, same rule as notify-email.ts, which this is designed to
// slot into.

export interface PlanLineContext {
  sv: boolean
  /** The substitute's link, from the plan's share token. */
  url: string
  /** Shown so the substitute knows what they are opening. */
  title?: string | null
  /** An unapproved plan must never be sent. */
  approved: boolean
}

/**
 * The paragraph to append to a cover email, or an empty string when there is
 * nothing to send. Callers append it; they never decide whether a plan is fit
 * to send, because that is the `approved` flag's job and it is checked here.
 */
export function planEmailLine(ctx: PlanLineContext): string {
  if (!ctx.approved || !ctx.url) return ''
  const heading = ctx.sv ? 'Lektionsplan' : 'Lesson plan'
  const lead = ctx.sv
    ? 'En färdig lektionsplan finns för den här lektionen:'
    : 'A ready lesson plan is available for this lesson:'
  const tail = ctx.sv
    ? 'Öppna länken på telefon eller dator. Den fungerar utan inloggning.'
    : 'Open the link on a phone or a computer. It works without signing in.'
  return (
    `\n\n${heading}\n` +
    `${lead}\n` +
    (ctx.title ? `${ctx.title}\n` : '') +
    `${ctx.url}\n` +
    `${tail}\n`
  )
}

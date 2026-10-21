# Lektionskollen → Frånvarokollen

Drop-in components for the `SwiftIron/Franvarokollen` codebase (Next.js + TypeScript
+ Tailwind, Supabase). Copy the files, apply the five small patches below, add three
environment variables, flip one flag.

The add-on's whole footprint inside Frånvarokollen is **one button in the lesson
popover** and **one line in the cover email**. Everything else — the request form,
the plan, the bank, the feedback — lives in Lektionskollen and opens in a panel.

## Why it is a separate project

Lektionskollen keeps its own Supabase project and its own deployment, because it
has to be:

- **switchable per school** — it is a paid add-on, not part of the base product
- **metered on its own** — model spend is a Lektionskollen cost, not a cover cost
- **removable** — delete it and Frånvarokollen still has a cover assignment with
  nothing dangling off it
- **cross-school** — the shared plan bank spans schools, which is a different
  trust boundary from Frånvarokollen's school-scoped RLS

Frånvarokollen stores nothing about Lektionskollen. A plan is found again from the
cover's own key (`lessonKey` → `absence_ref`), which Lektionskollen already records.

## Files to copy

```
src/lib/lektionskollen/client.ts
src/lib/lektionskollen/lesson-to-request.ts
src/lib/lektionskollen/lesson-to-request.test.ts
src/lib/lektionskollen/plan-email-line.ts
src/lib/lektionskollen/plan-email-line.test.ts
src/lib/lektionskollen/use-lesson-plan.ts
src/app/cover/lesson-plan-button.tsx
src/app/cover/lesson-plan-panel.tsx
```

Paths match the repo's own layout, so they go straight in. The two pure modules
(`lesson-to-request`, `plan-email-line`) follow the zero-import convention of
`src/lib/cover/notify-email.ts` and ship with vitest suites beside them.

## Environment

```
NEXT_PUBLIC_LEKTIONSKOLLEN_URL=https://pbamabzbfbkxajntsrmc.supabase.co
NEXT_PUBLIC_LEKTIONSKOLLEN_ANON_KEY=<the lektionskollen anon key>
NEXT_PUBLIC_LEKTIONSKOLLEN_APP_URL=https://franvarokollen.github.io/lektionskollen/app/
```

With any of them missing the button does not render, so an unconfigured
deployment behaves exactly as it does today.

## Patch 1 — `src/lib/config/features.ts`

```ts
  /** Email notification links on cover assignments */
  coverEmailNotify: false,

+ /** Lektionskollen — AI lesson plans for covered lessons. Paid add-on;
+  *  per-school once tiers land, as the note at the top of this file plans. */
+ lektionskollen: false,
} as const
```

## Patch 2 — `src/app/cover/grid-block-popover.tsx`

The popover already holds every fact a plan needs. Add the import:

```ts
import LessonPlanButton from './lesson-plan-button'
```

and build the facts once, next to the existing `emailCtx`:

```ts
const planLesson = {
  lessonKey: lesson.lessonKey,
  subject: lesson.subject,
  group: lesson.group,
  room: lesson.room,
  startTime: minutesToHHMM(lesson.startMins),
  endTime: lesson.endTime,
  length: lesson.length,
  absentTeacherName: lesson.absentTeacherName,
  coverName: coverName || null,
  subjectCode: lesson.subject,
}
```

Then render it in the two branches that can have a plan — the **assigned** block
(after the cover pill row) and the **uncovered** block (below the assign
combobox), plus the `isPast` branch where it renders read-only on its own:

```tsx
<LessonPlanButton lesson={planLesson} lang={sv ? 'sv' : 'en'} isPast={isPast} />
```

Nothing else in the popover changes. The `cancelled` branch gets no button: a
cancelled lesson needs no plan.

## Patch 3 — `src/lib/cover/notify-email.ts`

Give `EmailContext` an optional plan, and append the paragraph in
`buildSingleEmail` just before the signature:

```ts
import { planEmailLine } from '@/lib/lektionskollen/plan-email-line'
```

…except that `notify-email.ts` is a zero-import module by design, so keep it
that way: let the **caller** append instead.

In `grid-block-popover.tsx`, where `single` is built:

```ts
const planPara = plan?.approved && plan.share_token
  ? planEmailLine({ sv, url: planShareUrl(plan.share_token), title: plan.title, approved: true })
  : ''
const single = assigned ? buildSingleEmail(…) : null
const singleBody = single ? single.body + planPara : null
```

and hand `singleBody` to `buildMailUrls` and the copy button. The email machinery
stays pure; the add-on stays optional.

> `FEATURES.coverEmailNotify` is currently `false`, so this path ships when that
> flag is turned on. Until then the coordinator copies the link from the panel.

## Patch 4 — `src/components/sidebar.tsx`

The bank, the feedback queue and the add-on's settings do not belong in a day
grid. They get their own entry, gated like Radar and Hub:

```ts
...(FEATURES.lektionskollen && canViewCover
  ? [{ id: 'lessons', href: '/lessons', label: t('nav.lessons'), icon: 'clipboard' }]
  : []),
```

`/lessons` can be a one-line page embedding the same app without `embed=1`, or a
native port later. The button works without it.

## Patch 5 — `src/lib/i18n/translations.ts`

```ts
'nav.lessons': { sv: 'Lektionsplaner', en: 'Lesson plans' },
```

The components carry their own Swedish and English inline, so this is the only
new key.

## What the panel is

`index.html?embed=1&…` on the Lektionskollen deployment. Embed mode hides the
add-on's own chrome and opens straight onto the lesson passed in the query
string. The parameter list in `lesson-to-request.ts` is the entire contract:
subject, year, class group, length, times, room, the absent teacher's name, the
substitute's name, and the cover key. **No pupil data crosses, and the function
signature is what keeps it that way** — adding to it is a decision, not an
accident.

Back come two messages: `lk:ready` when the panel is up, and `lk:plan` when a
plan is approved, carrying the substitute's link.

## What is still to do

- **Auth.** The panel runs against the demo school on the anonymous key. For live
  schools Frånvarokollen mints a short-lived token for the Lektionskollen project
  so the coordinator never signs in twice — a server route here, a members lookup
  there. Marked in `client.ts`; no component changes when it lands.
- **Per-school flag.** `FEATURES.lektionskollen` is a build-time boolean today,
  like every other flag in that file. It becomes per-school when tiers arrive.
- **`/lessons` route.** Not needed for the button to work.

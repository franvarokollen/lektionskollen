# Embedding Lektionskollen in Frånvarokollen

Lektionskollen is a self-contained **add-in**. FVK loads it in an `<iframe>` and the two sides talk **only** through `postMessage`.
It never reads FVK's database, and FVK never reaches into its UI.

- **Add-in URL:** `https://<host>/lektionskollen/embed.html`
- **Reference host:** `index.html` (the mock-FVK test harness). `src/harness/AddinFrame.jsx` is a working ~40-line host implementation.
- **Protocol id:** every message is `{ protocol: "lektionskollen/1", type, payload }`

## Lifecycle

```
FVK                                   Add-in (iframe)
 │  user presses "Lektionsplan behövs"
 │── create iframe(embed.html) ───────▶│
 │◀──────────────── lk:ready ──────────│
 │── lk:init {mode, absence, …} ──────▶│  form prefilled from the absence
 │                                     │  … generates plan …
 │◀──────────── lk:plan-created ───────│  FVK marks the absence "has plan"
 │◀──────────── lk:send-to-sub ────────│  FVK sends it to the assigned vikarie
 │◀──────────────── lk:close ──────────│  FVK removes the iframe
```

## FVK → add-in

| type | payload | notes |
|------|---------|-------|
| `lk:init` | `{ mode: "request" \| "view", absence, planId?, lang: "sv" \| "en", token? }` | Send it after `lk:ready`. You can send it again to reuse the same iframe. |
| `lk:set-lang` | `{ lang }` | Switch the UI language live. |

**`absence`** carries the only FVK data the add-in receives. Keep it minimal, and **never send pupil data**.

```json
{
  "id": "abs-1002",            // FVK absence/cover id → stored as absence_ref
  "teacher": "Anna Lindqvist",
  "group": "8A",
  "yearGroup": "Åk 8",
  "subject": "Matematik",
  "time": "09:40–10:40",
  "durationMinutes": 60,
  "cover": "Erik (vikarie)"     // or null
}
```

**`token`** is the signed-in user's Supabase JWT (production), which the add-in uses to call the `generate-lesson` edge function.
`ai` is a test-only override (`{ aiMode, baseUrl, model, jsonMode }`) that the harness uses. Ignore it in FVK.

## Add-in → FVK

| type | payload | FVK should |
|------|---------|------------|
| `lk:ready` | `{ protocol }` | Reply with `lk:init`. |
| `lk:plan-created` | `{ absenceRef, planId, title, model, durationMs }` | Store `planId` on the absence and show a "View plan" button. |
| `lk:send-to-sub` | `{ absenceRef, planId, title }` | Send the plan link to the assigned vikarie (FVK owns the contact details). |
| `lk:close` | `{}` | Remove the iframe. |
| `lk:resize` | `{ height }` | Optional: size the iframe to its content. |
| `lk:error` | `{ code, message }` | Optional: log it or show a message. |

## Security
- The add-in only accepts messages from origins listed in `VITE_ALLOWED_HOST_ORIGINS`. The test build uses `*`; production should set it to FVK's origin(s).
- After `lk:init`, the add-in replies **only** to the origin that initialised it.
- Data model: Lektionskollen's own tables (`lesson_requests`, `lesson_plans`) are keyed by `absence_ref`. FVK keeps the absence, Lektionskollen keeps the plan.

## Open items for integration (phase 2)
- **Shared auth:** decide whether this is the same Supabase project as FVK or a separate one with a token exchange.
- **Plan storage:** move it from localStorage to `lesson_plans`. While storage is per-browser, `planId` only resolves in the browser that created the plan.
- **Vikarie view:** a read-only page at `embed.html?share=<share_token>` that needs no login.

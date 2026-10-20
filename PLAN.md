# Lektionskollen – plan

An add-on to **Frånvarokollen** that creates a turnkey substitute lesson plan **on demand**.
It never runs automatically, because many schools already have a plan in place. It only runs when someone presses **Lektionsplan behövs** on an absence or cover.

## Flow
1. An absence is registered in FVK and the cover is assigned (FVK as today).
2. The coordinator presses **Lektionsplan behövs** on that absence row.
3. A form opens, prefilled from the absence (subject, group, length). The coordinator optionally adds a topic, notes and the available resources.
4. One plan is generated: scripted, with every material written out and answers included.
5. The coordinator reviews the plan, then prints it or sends it to the vikarie (link or email).
6. The plan is stored against the absence and becomes reusable from the school bank.

## Carried over from Vikarieplaneringen
- The prompt rules: no phantom references, everything embedded, one lesson only, scripted teacher language, expected responses, check questions without hands-up, and the language anchor at the top **and** bottom.
- Defensive output handling: `asLine` / `asList` coercion, plus a truncation-repair JSON parser.
- The school bank idea, so plans can be reused across absences and later across schools.

## Changed or dropped
- **No BYO keys in the browser.** There is one server-side path (a Supabase Edge Function). During development, the browser can call a local model directly.
- **The OpenAI-compatible adapter only.** Local (LM Studio or Ollama) → hosted (Gemini, Claude or OpenAI) is a config change, not a code change.
- Apps Script backend → Supabase (Postgres + RLS + Edge Functions).
- The CDN React / Babel setup → Vite + React.
- Pools and extras tabs are deferred, so the core flow gets proven first.

## Phases
| # | Goal | Done when |
|---|------|-----------|
| 0 | Scaffold: Vite app, shared AI core, schema, edge function | `npm run build` passes ✅ |
| 1 | Generate, view, print and save locally, with mock absences | Good plans from a local model for 5 test subjects |
| 2 | Supabase auth and persistence, real FVK absence feed, **Send to vikarie**: email package and read-only link (`share_token`), with room, time and sub email auto-filled from the FVK cover (evolves the old `SubEmailPackage`, which needed manual entry) | A coordinator sends a plan in one click |
| 3 | School bank: reuse or adapt an existing plan before generating a new one | The "Use existing" option shows on the request form |
| 4 | Extras on demand (worksheet PDF, flashcards), **filler bank** (short rated time-fillers by year band; from the old `FillerBank`), translation cached per plan | Lazy tabs on the plan view, plus a filler tab |
| 5 | Hosted model, per-school metering (`usage_events`), quotas, pricing tier | Usage dashboard per school |

## Open questions
- What is the FVK absence API shape, and how is auth shared (same Supabase project or a separate one)? → **Gareth**
- Which hosted model gives the best Swedish quality per krona? Benchmark this in phase 5.
- Should this be priced as an add-on, or included in a higher FVK tier?
- GDPR: no pupil data should be sent to the model. Today we only send subject, year group and topic. Keep it that way.

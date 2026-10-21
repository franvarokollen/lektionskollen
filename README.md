# Lektionskollen

On-demand substitute lesson plans, built as a **Frånvarokollen add-in**. See [PLAN.md](PLAN.md), and for the FVK handover see [docs/EMBED.md](docs/EMBED.md).

The repo contains two pages:

| Page | What it is |
|------|------------|
| `index.html` | **Test harness**: a mock FVK host that embeds the add-in exactly as FVK will, plus a live postMessage log and an AI-source switch. |
| `embed.html` | **The add-in**: what FVK loads in an iframe. |

## Test it online
Every push to `main` deploys to `https://franvarobot.github.io/lektionskollen/`. The old app stays at `/legacy/`.

In the harness, press **⚙** (top right) to choose the AI source:
- **Local model (this PC):** the page calls LM Studio or Ollama on `localhost`. Enable CORS in the server, and allow Chrome's *local network access* prompt.
- **Hosted (Supabase):** the `generate-lesson` edge function, which is the production path. This needs the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` repo Variables.

## Run locally
1. Start a local model with an OpenAI-compatible server:
   - **LM Studio:** load a model (for example *Qwen2.5 14B Instruct* or *Gemma 3 12B*), start the server on port 1234, and **enable CORS**.
   - **Ollama:** `OLLAMA_ORIGINS=* ollama serve`, then `ollama pull qwen2.5:14b`. Choose JSON mode `json_object` in ⚙.
2. Run the app:
   ```bash
   npm install
   npm run dev        # harness → http://localhost:5173   add-in → /embed.html
   ```
3. Press **Lektionsplan behövs** on an absence.

> Models under ~12B parameters tend to produce weak Swedish and break the JSON. The repair parser helps, but quality comes from the model.

## Edge function (the hosted path)
```bash
supabase init && supabase start && supabase db reset
cp supabase/functions/.env.example supabase/functions/.env
supabase functions serve generate-lesson --env-file supabase/functions/.env
```
To switch model provider, change `AI_BASE_URL`, `AI_MODEL` and `AI_API_KEY` in the function secrets. No code change is needed.

## Structure
```
index.html / embed.html     harness / add-in entry points
src/
  harness/                  mock FVK host: HarnessApp, AddinFrame, SettingsPanel, EventLog
  embed/                    the add-in: EmbedApp (lk:init → form → plan → events)
  components/               RequestModal, PlanView, AbsenceList, PlanLibrary
  lib/bridge.js             postMessage protocol (lektionskollen/1)
  lib/config.js             AI source: host init > harness settings > build env
  lib/ai.js                 local model or edge function
  lib/store.js              localStorage now → Supabase in phase 2
supabase/
  functions/_shared/        prompt.ts, generate.ts, json.ts (shared by the app AND the edge function)
  functions/generate-lesson/
  migrations/               schools, members, lesson_requests, lesson_plans, usage_events (+ RLS)
docs/EMBED.md               the integration contract for FVK
legacy/                     the old Vikarieplaneringen app
```

## Both languages, every time

Swedish and English are equal here: a coordinator may run the app in either,
and a substitute opens the plan link in whichever they read. Three separate
bugs shipped because a string was added to one side only, or pasted into the
wrong block where a duplicate silently overwrote it.

```
node tools/i18n-check.mjs
```

Run it before any push that touches text. It fails on a key present in one
language and not the other, on a duplicate key inside one block, and on a value
identical in both (usually a forgotten translation — genuine same-in-both words
are listed in the script).

Three things the check cannot see, so they need remembering:

- **Plan content.** A generated plan is written in both languages by
  `lk-generate`; anything seeded by hand needs `body_alt` and `language_alt`
  filling too, or the toggle leaves the reader on the Swedish text.
- **Subject and year group.** Stored as the Swedish the timetable imports
  (`Matematik`, `Åk 7`) and turned at display time by `subjectLabel()` and
  `yearLabel()` in `app/lk.js`. A new subject needs a line in `SUBJECTS_EN`.
- **Messages built in code.** Errors and toasts are easy to write as a bare
  Swedish string. They belong in `i18n.js` like everything else.

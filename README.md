# Lektionskollen

Lesson plans for Swedish schools: **create** them (with AI, from your own document, or by hand) and keep a **bank** of them, shared between schools when a plan has earned it. A standalone product that can be linked into Frånvarokollen (FVK) when a school has both.

Live: `https://franvarobot.github.io/lektionskollen/` (redirects to `app/`). Every push to `main` is served as-is by GitHub Pages. The old app stays at `/legacy/`.

## What is where

| Path | What it is |
|------|------------|
| `app/` | **What Pages serves.** `index.html` (Lektionskollen, the product), `plan.html` (the substitute's page), `fvk-demo.html` (test page: LK inside a copy of Frånvarokollen, to judge the integration, with an add-on bought / not bought switch), `lk.css`, and the built `*.js`. Both coordinator pages run the same `lk.js`; `<body data-shell>` picks the shell. |
| `app-src/` | The TypeScript the `app/*.js` files are built from. **Edit here, never `app/*.js`.** |
| `app-src/lk*.ts` | The coordinator app, bundled into `app/lk.js`. `lk.ts`: start-up, language, events. `lk-core` (database client, strings, state), `lk-shell` (nav, titles), `lk-signin`, `lk-cover` (stand-in feed, popover, plan per slot), `lk-daily` (the cover grid), `lk-link` (checks, plan line, teacher's own link), `lk-embed` (panel and FVK embed), `lk-generate` (request form, generation), `lk-approve` (approval ladder), `lk-panel` (open plan), `lk-assist` (extra-help preview), `lk-catalog`, `lk-pool`, `lk-wait`, `lk-feedback`, `lk-term`, `lk-create`, `lk-today` (standalone Day plan: plans in use by day, Plan a lesson for any date, remove or swap), `report` (error reporting and Report a problem, shared with the substitute page). |
| `app-src/plan*.ts` | The substitute's page, bundled into `app/plan.js`. `plan.ts`: events and start-up. `plan-core` (types, database client, the page state `P`), `plan-load`, `plan-render`, `plan-assist` (extra help), `plan-depth` (how much is written out, pupil sheet tier), `plan-teacher` (the class teacher's view), `plan-linked` (a school's own linked plan). `plan-view` renders a plan for both apps. |
| `app-src/css/` | The stylesheet, one file per screen, built into `app/lk.css`. The number in each name is its place in the cascade. |
| `supabase/migrations/` | The database: `…_lk_baseline.sql` rebuilds everything LK owns from nothing; later files change it, in order. |
| `supabase/migrations-archive/` | The migrations that led to the baseline, kept for history. Not run. |
| `supabase/functions/` | Edge functions (helpers they share are in `_shared/`): `lk-generate` (write, translate, convert, fix a plan), `lk-assist` (live help for the substitute), `lk-verify`, `lk-import` (year plans), `lk-checklink`. |
| `fvk-integration/` | Drop-in files for FVK's own codebase (not built here). |
| `docs/` | `AUTH.md` (sign-in plan), `HANDOVER-FVK-INTEGRATION.md` + `FVK-ISSUES-lektionskollen.md` (the FVK link), `EMBED.md`. |
| `tools/` | Build and checks (below). |
| `legacy/` | The previous app, kept for reference. |

## Work on it

```bash
npm ci
node tools/build-app.mjs      # app-src/*.ts → app/*.js
npm run check:app             # everything CI runs
cd app && python3 -m http.server 8099   # then open http://localhost:8099
```

Install the pre-commit hook once: `ln -s ../../tools/pre-commit .git/hooks/pre-commit`. It typechecks, rebuilds and restamps on every commit, so source and bundle cannot drift.

### Checks (`npm run check:app`, and CI on every PR)

| Check | Guards |
|-------|--------|
| `tsc` | Strict TypeScript, including unused code and unchecked index access |
| `build-app --check` | The committed `app/*.js` and `app/lk.css` are exactly what `app-src/` builds |
| `i18n-check` | Every string in both Swedish and English, no duplicates |
| `deck-check` | The projector never shows pupils an answer |
| `pool-check` | The bank keeps every plan, in rank, on the right shelf |
| `term-check` | A pasted year plan becomes the right weeks |
| `prompt-check` | The generator's prompt fits the year group and subject |
| `tools/db/replay.sh` (CI job `database`) | The database rebuilds from the repo alone on an empty Postgres, and `tools/db/smoke.sql` passes on it |

### Changing the database

Add a new file to `supabase/migrations/` (name it `YYYYMMDDHHMMSS_what.sql`) and run `tools/db/replay.sh` against a local Postgres before applying it live. To start a fresh baseline: run `tools/db/dump.sql` on the live project, then `node tools/db/baseline.mjs dump.json`, and move the old files to `supabase/migrations-archive/`.

In a browser, against the live demo (not in CI): `tools/e2e.mjs` (flows that have broken before) and `tools/lang-audit.mjs` (SV/EN on every screen). `tools/smoke.mjs` records a behaviour fingerprint of every screen in both languages, to compare before and after a change.

## The AI

`lk-generate` needs `AI_BASE_URL`, `AI_MODEL` and `AI_API_KEY` as function secrets (see `supabase/functions/README.md`). Changing provider is a secret change, not a code change.

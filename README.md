# Lektionskollen

On-demand substitute lesson plans – a Frånvarokollen add-on. See [PLAN.md](PLAN.md).

## Quick start (local model, no Supabase)

1. Start a local model with an OpenAI-compatible server:
   - **LM Studio:** load a model (for example *Qwen2.5 14B Instruct* or *Gemma 3 12B*), start the server on port 1234, and **enable CORS**.
   - **Ollama:** `OLLAMA_ORIGINS=http://localhost:5173 ollama serve`, then `ollama pull qwen2.5:14b`.
2. Set up and run the app:
   ```bash
   cp .env.example .env      # set VITE_AI_BASE_URL / VITE_AI_MODEL
   npm install
   npm run dev
   ```
3. Open http://localhost:5173, then press **Lektionsplan behövs** on an absence.

> Models under ~12B parameters tend to produce weak Swedish and break the JSON. The repair parser helps, but quality comes from the model.

## Edge mode (Supabase, the production path)

```bash
supabase init                      # first time only (creates config.toml)
supabase start
supabase db reset                  # applies supabase/migrations
cp supabase/functions/.env.example supabase/functions/.env
supabase functions serve generate-lesson --env-file supabase/functions/.env
```
Then set `VITE_AI_MODE=edge` and the Supabase URL and anon key in `.env`.

To move to a hosted model later, change `AI_BASE_URL`, `AI_MODEL` and `AI_API_KEY` in the function secrets. No code change is needed.

## Structure
```
src/
  App.jsx                 tabs: absences today / lesson plans
  components/             AbsenceList, RequestModal, PlanView, PlanLibrary
  data/mockAbsences.js    stand-in for the FVK absence feed
  lib/ai.js               direct (local) or edge mode
  lib/store.js            localStorage now → Supabase in phase 2
  lib/i18n.js             sv / en UI
supabase/
  functions/_shared/      prompt.ts, generate.ts, json.ts (shared by the app AND the edge function)
  functions/generate-lesson/
  migrations/             schools, members, lesson_requests, lesson_plans, usage_events (+ RLS)
```

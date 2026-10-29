# lk-generate

The deployed edge function (Supabase project `pbamabzbfbkxajntsrmc`). These
files are the source of truth; redeploy after changing them.

| File | What it is |
|---|---|
| `index.ts` | Entry point: allowance, model call, quality gate. |
| `prompt.ts` | The prompt rules carried over from Vikarieplaneringen. |
| `../_shared/` | Shared by every function: `http.ts` (CORS, JSON), `model.ts` (temperature, thinking budget), `repair.ts` (reading imperfect model JSON). Deployed with each function that imports it. |

## Switching on a real model

Set these as function secrets — no code change:

```
AI_BASE_URL   https://generativelanguage.googleapis.com/v1beta/openai
AI_MODEL      gemini-2.5-flash
AI_API_KEY    …
AI_JSON_MODE  json_object      # optional; Ollama supports it, LM Studio does not
AI_MODEL_SMALL gemini-2.5-flash-lite  # optional; cheaper model used for translations (and by lk-assist)
```

With `AI_BASE_URL` or `AI_MODEL` unset the function answers from `library.ts`,
which is how the test environment runs today.

## One generation, one translation

The page asks for the plan in the writer's language, then calls this function
again with `translate: <that plan>` for the other language. With a model set,
the second call is a translation (on `AI_MODEL_SMALL` if set): cheaper than a
second generation and the two languages stay the same lesson. With no model
the written library answers in both languages as before.

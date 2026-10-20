# lk-generate

The deployed edge function (Supabase project `pbamabzbfbkxajntsrmc`). These
files are the source of truth; redeploy after changing them.

| File | What it is |
|---|---|
| `index.ts` | Entry point. Picks the model path or the written library by env. |
| `prompt.ts` | The prompt rules carried over from Vikarieplaneringen. |
| `repair.ts` | Coercion and truncation repair for model output. |
| `library.ts` | Written plans in sv and en, served while no model is set. |

## Switching on a real model

Set these as function secrets — no code change:

```
AI_BASE_URL   https://generativelanguage.googleapis.com/v1beta/openai
AI_MODEL      gemini-2.5-flash
AI_API_KEY    …
AI_JSON_MODE  json_object      # optional; Ollama supports it, LM Studio does not
```

With `AI_BASE_URL` or `AI_MODEL` unset the function answers from `library.ts`,
which is how the test environment runs today.

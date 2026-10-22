# Edge function configuration

All three AI functions (`lk-generate`, `lk-verify`, `lk-assist`) read the same
secrets, set once under **Project Settings → Edge Functions → Secrets**.

| Secret | Required | Notes |
|---|---|---|
| `AI_BASE_URL` | yes | Provider endpoint, without `/chat/completions`. |
| `AI_API_KEY` | yes | |
| `AI_MODEL` | yes | Main generation. |
| `AI_MODEL_SMALL` | no | Translation and live assists. Falls back to `AI_MODEL`. |
| `AI_MODEL_VERIFY` | no | Answer checking. Falls back to `AI_MODEL`. |
| `AI_JSON_MODE` | no | Set to `json_object` only if the provider honours it. |
| `AI_TEMPERATURE` | no | Omitted when unset. See below. |
| `AI_MAX_TOKENS` | no | Output ceiling for a generated plan. Default 16000. |
| `AI_THINKING_BUDGET` | no | Tokens the model may spend reasoning. See below. |

## Anthropic

```
AI_BASE_URL      https://api.anthropic.com/v1
AI_API_KEY       sk-ant-...
AI_MODEL         claude-sonnet-5-5
AI_MODEL_SMALL   claude-haiku-5-5
AI_MODEL_VERIFY     claude-sonnet-5-5
AI_THINKING_BUDGET  3000
```

Leave `AI_JSON_MODE` and `AI_TEMPERATURE` **unset**:

- `response_format` is ignored by Anthropic's OpenAI compatibility layer, so
  `AI_JSON_MODE` would do nothing. The functions strip code fences and parse the
  JSON themselves, which is what actually handles it.
- **Any temperature below 1 returns a 400** on current Claude models through
  that layer. Every function used to pin it low, which would have failed every
  call; it is now omitted unless `AI_TEMPERATURE` is set.
- **Thinking is on by default on Claude 5 models and is billed against
  `max_tokens`.** A full plan needs most of that budget for JSON, so without a
  cap the reasoning eats the allowance and the plan arrives truncated — which is
  exactly what happened on the first three live generations. `reasoning_effort`
  is ignored by the compatibility layer, so `AI_THINKING_BUDGET` sets it
  instead: a number is the budget, `0` disables thinking altogether. Against
  Anthropic it defaults to 3000 when unset, because leaving it out is the broken
  case rather than the safe one. Other providers get nothing unless it is set,
  since one that does not know the field may reject the request outright.

Anthropic's own documentation says the compatibility layer is "primarily
intended to test and compare model capabilities" and "not considered a
long-term or production-ready solution". It is the fastest way to get running,
but the native Messages API is where this should end up: it is a different
request and response shape, so it is a real change, not a config switch.

Source: https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk

## OpenAI, Gemini, OpenRouter

These speak `/chat/completions` natively. `AI_JSON_MODE=json_object` and
`AI_TEMPERATURE` (e.g. `0.4`) both work.

# lk-assist

In-lesson help. The substitute presses a button inside the plan and gets one
short, usable thing back: a different explanation, more practice, an easier or
harder version, or an activity that fills the minutes they have left.

## Two modes

| env | behaviour |
|---|---|
| `AI_BASE_URL` + `AI_MODEL` unset | returns a written teaching move from `library.ts` |
| both set | calls an OpenAI-compatible `/chat/completions` |

Optional: `AI_API_KEY`, `AI_JSON_MODE=json_object`.

## What the written path is, honestly

Without a model it cannot produce subject content, so it does not try. It
returns a real teaching technique the substitute can apply to whatever is
already on the board — concrete-to-abstract re-explanation, a my-turn /
our-turn / your-turn practice structure, a difficulty ladder, time-boxed
revision. Executable with zero subject knowledge. The response carries
`source: "library"` and the UI badges it, so nobody mistakes one for
generated content.

## Falling back, not failing

Once a model *is* configured, any model error, empty response, malformed JSON
or timeout past 25 seconds still returns a written move with
`source: "fallback"`. A substitute standing in front of a class gets an
answer, never a spinner or an error.

## Request

```json
{
  "kind": "explain | exercise | level | filler",
  "section_ref": "phase:2",
  "section_label": "Genomgång på tavlan",
  "section_text": "...what that part of the plan says...",
  "variant": "easier | harder",
  "language": "sv | en",
  "subject": "Matematik",
  "year_group": "Åk 7",
  "topic": "Bråk på tallinjen",
  "minutes_left": 9
}
```

## Response

```json
{
  "extra": { "title": "...", "lines": ["..."], "board": "...", "tasks": [], "minutes": 8 },
  "model": "canned",
  "source": "library | model | fallback",
  "ms": 3
}
```

Saving is separate, and server-side: the page calls `lk_assist_save`, which
enforces the per-plan daily quota (20) and flags the row for coordinator
review. The quota is there because the page this is called from has no login.

## Cost controls

- **Small model:** set `AI_MODEL_SMALL` to run extras on a cheaper, faster model; falls back to `AI_MODEL`.
- **Cache:** the same section + kind + variant + language returns the stored answer (`source: "cache"`, no model call). Only complete model answers are stored. The cache is private to this function (service role); entries expire after 180 days.
- **Cap:** extras per plan per day come from a school setting (5 / 20 / unlimited), enforced in the database.

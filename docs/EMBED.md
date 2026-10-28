# Embedding Lektionskollen in Frånvarokollen

FVK opens Lektionskollen in an `<iframe>` (a side panel) on one covered lesson. The two talk only through the URL going in and `postMessage` coming out. LK never reads FVK's database; FVK stores nothing about LK.

The full, current integration (files to copy into FVK, patches, tests, the open auth bridge) is in [`fvk-integration/README.md`](../fvk-integration/README.md) and [`HANDOVER-FVK-INTEGRATION.md`](HANDOVER-FVK-INTEGRATION.md). This page is the contract in brief.

## In: the URL

```
https://<host>/lektionskollen/app/?embed=1&lang=sv&ref=<lessonKey>
  &subject=&code=&year=&group=&mins=&start=&end=&room=&teacher=&cover=&practical=
```

The parameter list in `fvk-integration/src/lib/lektionskollen/lesson-to-request.ts` is the whole contract. No pupil data crosses; adding a parameter is a decision, not an accident.

## Out: messages to the parent

Every message is `{ source: 'lektionskollen', type, ...payload }`.

| `type` | When | Payload |
|--------|------|---------|
| `lk:ready` | The panel is up | `ref` |
| `lk:plan` | A plan was approved for this lesson | the substitute's link and plan details |
| `lk:close` | The user closed the panel | — |

FVK must check `event.origin` against the LK host before trusting a message (see the handover, §4).

## Sign-in

LK has its own sign-in for schools without FVK. When linked, FVK hands its signed-in user over so nobody signs in twice. See [`AUTH.md`](AUTH.md).

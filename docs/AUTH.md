# Sign-in — option A (planned, mocked in the app)

Lektionskollen (LK) is its own product. A school can buy LK alone, Frånvarokollen
(FVK) alone, or both linked. So LK has its own sign-in, and FVK can hand a
signed-in user over to it.

```
  Standalone school                         School with FVK + LK
  ─────────────────                         ────────────────────
  LK sign-in screen                         Coordinator signs in to FVK
   ├─ Google      (Supabase OAuth)           └─ clicks "Lesson plan"
   ├─ Microsoft   (Supabase OAuth 'azure')       └─ FVK server route mints a
   └─ email link  (Supabase OTP)                    short-lived LK session
        │                                              │
        └──────────────► LK session ◄──────────────────┘
                          lk_me() → school + role from lektionskollen.members
```

## Why not FVK's login alone

FVK and LK are separate Supabase projects with separate user tables. An FVK
session proves who someone is to FVK only. A school without FVK must still sign
in somewhere, so LK keeps its own; linking is the bridge, not the requirement.

## Pieces

| Piece | Where | State |
|---|---|---|
| Sign-in screen (Google, Microsoft, email link, demo) | `app/index.html` (and `app/fvk-demo.html`) `#signin`, `mockSignIn()` | **Mocked** — every option opens the demo school |
| Real calls | marked in `mockSignIn()` | to do |
| Members / roles (coordinator, teacher, admin) | `lektionskollen.members`, `lk_me()` | exists; anon falls back to demo school |
| Turn off demo fallback | revoke anon grants on `lk_*` | to do, at go-live |
| FVK bridge | FVK server route → LK session (`setSession`) | to do — see `fvk-integration/README.md` "Auth" |
| Account match | same work email = same LK user | to do |
| Settings → Link to Frånvarokollen | `fvkLinkCard()` | **Mocked** status card |

## Open question

How do people sign in to FVK today (email + password, Google, Microsoft)? The
bridge works either way, but the answer decides whether a linked school's
teachers can also sign in to LK directly with the same provider.

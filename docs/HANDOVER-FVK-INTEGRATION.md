# Handover — adding Lektionskollen to Frånvarokollen

**To:** Gareth's AI session (and Gareth). **From:** the Lektionskollen (LK) build session, for Baz Shaw.
**Date:** 2026-10-24, **updated 2026-10-28** (see §11 change log). **Format:** follows `HANDOVER-TEMPLATE.md`. Read §0 and §1 first.

> **⚠ 2026-10-28 — direction changed.** LK is now a **standalone product** that a school can buy on its own, and that
> can *optionally* be linked to FVK when a school has both. LK therefore gets **its own sign-in** (Google, Microsoft,
> email link), and the FVK link becomes a **bridge**: FVK hands its signed-in user over so nobody signs in twice.
> This replaces the 2026-10-24 decision "LK has no login of its own". §4.1 and §5 are updated; full plan in
> `docs/AUTH.md` in the LK repo.

**The through-line.** LK is a finished, separately hosted product that FVK can link to. Frånvarokollen (FVK) already carries two pure LK
modules. What is left is a small, flag-gated, additive patch to FVK, an auth handshake that only FVK can build, and
Gareth's own testing. Nothing here has been run inside FVK. Nobody on the LK side has the live FVK repo, so every FVK
statement below comes from a zip of the repo (`Franvarokollen-dev.zip`, supplied by Baz on 2026-10-20/21).

---

## 0. TOP ACTION FOR YOUR SESSION

1. **Do not apply anything yet.** Pull current `dev`, then compare it with the files named in §3. The zip is a snapshot; live git wins.
2. Read §4 (hard blockers). **The add-on must stay off for real schools until the auth handshake in §4.1 exists.**
3. Apply the patch in §3 on a branch off `dev`, flag **off**, and run the existing suite. Expected result: no change in any existing test.
4. Then work through the test checklist in §7 with the flag on against a test school.

The rule for the whole job: **add, never replace.** With `FEATURES.lektionskollen = false`, FVK must behave and render exactly as it does today.

---

## 1. ★ PROVENANCE — how to trust this document

- `[verified]` — read in the actual files this session (the FVK zip or the LK repo at commit `0cc2614`).
- `[carried-forward]` — taken from earlier LK sessions, not re-checked today. May be stale.
- `[verify]` — a check your session must do. The LK side cannot do it.

**Ground-truth rule:** your live git beats this document. If a line number, function name or file here disagrees with
the live repo, the repo is right and this document is stale.

**Nothing in this package was run inside FVK.** No FVK test, typecheck, build or browser run happened on the LK side. [verified]
The FVK zip's `node_modules` is present, but nobody ran `vitest` or `tsc` on it for this handover. [verify]

---

## 2. WHAT EXISTS

### 2a. Lektionskollen (the add-on) — built, running, separate project
- **Repo:** `franvarokollen/lektionskollen`, `main` at `0cc2614`. UI served from GitHub Pages: `https://franvarokollen.github.io/lektionskollen/app/`. [verified]
- **Backend:** its own Supabase project `pbamabzbfbkxajntsrmc` (not FVK's). Schema `lektionskollen` is not exposed; all access is through `public.lk_*` SECURITY DEFINER functions. Five edge functions: `lk-generate`, `lk-assist`, `lk-verify`, `lk-import`, `lk-checklink`. [verified]
- **Own AI key** connected and tested; plan generation and in-lesson help work. [verified, 2026-10-24]
- **Quality gate:** every plan is checked by `lk_check_plan` before it can be approved; all 38 active library plans pass in Swedish and English. [verified, 2026-10-24]
- **Approval ladder:** a plan is only sent to a substitute once approved (`approved_sha`, `approved_kind`). Demo-school approvals are mock-up only. [carried-forward]
- **Languages:** everything is Swedish and English. [carried-forward]
- **Retention:** nightly job `lk_nightly_retention()` nulls expired teacher links and notes, and clears substitute notes and comments after 90 days. [carried-forward]

### 2b. Already inside FVK (per your zip) [verified]
- `src/lib/lektionskollen/lesson-to-request.ts` + `.test.ts` — turns a cover row into the panel URL. Zero imports, no pupil data. Identical to LK's copy.
- `src/lib/lektionskollen/plan-email-line.ts` + `.test.ts` — the plan paragraph for the substitute email; sends nothing unless `approved`.
- Nothing else. **No component calls these yet.**

### 2c. Written but not yet in FVK: `fvk-integration/` in the LK repo [verified: files read]
`client.ts`, `use-lesson-plan.ts`, `lesson-plan-button.tsx`, `lesson-plan-panel.tsx`, and a `README.md` with five patches.
It was written against an earlier FVK snapshot. **Re-verify every patch against live `dev`** (§3).

### 2d. The contract between the two [verified]
- **FVK → LK:** the panel URL only: `index.html?embed=1&lang=&ref=<lessonKey>&subject=&code=&year=&group=&mins=&start=&end=&room=&teacher=&cover=&practical=`. Pupil data never crosses; the parameter list in `lesson-to-request.ts` is the enforcement.
- **LK → FVK:** `postMessage` with `source: 'lektionskollen'`: `lk:ready` `{ref}`, `lk:close`, and `lk:plan` `{planId, ref, shareToken, url, title}` (sent when a plan is approved).
- **FVK reads status** with the anonymous Supabase client: `rpc('lk_plan_for_cover', { p_absence_ref })` returns `{id, title, approved, shared, share_token, …}` or null.
- **Stale doc warning:** `docs/EMBED.md` in the LK repo describes an older protocol (`lektionskollen/1`, `lk:init`). The code uses the query string plus the messages above. Trust the code, not EMBED.md.

---

## 3. THE FVK PATCH (additive, flag-gated)

Everything below is **new files or one-line hooks**. Verify each target against live `dev` first (`[verify]`).

| # | File | Change | Size |
|---|---|---|---|
| 1 | `src/lib/config/features.ts` | add `lektionskollen: false` | 1 line |
| 2 | `src/app/cover/lesson-plan-button.tsx` | NEW (77 lines) | new file |
| 3 | `src/app/cover/lesson-plan-panel.tsx` | NEW (92 lines) | new file |
| 4 | `src/lib/lektionskollen/client.ts`, `use-lesson-plan.ts` | NEW | new files |
| 5 | `src/app/cover/grid-block-popover.tsx` | build `planLesson` once; render `<LessonPlanButton …/>` in the assigned, uncovered and `isPast` branches; **not** the cancelled branch | ~15 lines |
| 6 | `src/lib/security/csp.ts` | allow our origin in `frame-src` (currently `'none'`) | **missing from the earlier README** |
| 7 | `src/components/sidebar.tsx` + `translations.ts` | optional `/lessons` entry behind the flag | optional |
| 8 | `src/lib/cover/notify-email.ts` caller | append `planEmailLine(...)` in the caller, keep `notify-email.ts` zero-import | only when `coverEmailNotify` is on |

Environment (all three required, else the button does not render):
`NEXT_PUBLIC_LEKTIONSKOLLEN_URL`, `NEXT_PUBLIC_LEKTIONSKOLLEN_ANON_KEY`, `NEXT_PUBLIC_LEKTIONSKOLLEN_APP_URL`.

### 3a. Things in the earlier package that need fixing before you apply it
- **Missing CSP change (#6).** `csp.ts` has `frame-src 'none'` and `frame-ancestors 'none'`. The panel is an iframe, so `frame-src` must list the LK origin (and only that). Security review: Gareth. `[verify]` also `X-Frame-Options: DENY` in the same file — it applies to FVK's pages, not ours, but confirm.
- **The panel does not check who sent a message.** `lesson-plan-panel.tsx` and `use-lesson-plan.ts` accept any `message` with `source: 'lektionskollen'`. Add: `e.origin === new URL(lektionskollenBase()).origin` and `e.source === frameRef.current?.contentWindow`. LK side posts with target `'*'` by design (it only reports a share link).
- **File size.** `grid-block-popover.tsx` is already 413 lines (conventions ceiling ~300). Keep the hook to the smallest possible diff and log it in `KNOWN-DRIFT.md` if it grows.
- **`any`:** none were added in the LK files; check again after merging. `[verify]`
- **Tests:** the two pure modules have vitest suites. The button, panel and hook have **none**. Conventions B3 applies to `lib/` logic; add tests for `use-lesson-plan.ts` at least. `[verify]`

### 3b. Not yet mapped: other places a lesson is clicked
Only `grid-block-popover.tsx` is covered. FVK also handles right-click and lesson interaction in
`timeline-grid-view.tsx`, `timeline-view.tsx`, `daily-tab.tsx`, `absent-panel.tsx`, `cover-client.tsx`,
`staff-context-menu.tsx`, `staff-chip-strip.tsx`, `suppressed-block-popover.tsx` and `long-term-absence-panel.tsx`.
`grep` found context-menu handling in all of these. **Nobody has decided whether the add-on needs an entry in any
of them.** Your session should map each and decide, entry by entry, with Baz. Default: only the lesson popover, nothing else.

---

## 4. HARD BLOCKERS AND OPEN ITEMS

### 4.1 Auth — the add-on must not be switched on for real schools until this exists [verify]
- Today the panel and `lk_plan_for_cover` run on the **anonymous** LK key. Anonymous calls fall back to LK's **demo school** (`02ee8d75-…`). [verified]
- Consequence if enabled for a real school now: lookups would not be scoped to that school, so two schools whose `lessonKey` values collide could see each other's plan status. **This is the reason for the hard stop.**
- ~~**Decision (Baz, 2026-10-24):** LK has no login of its own; FVK is the gatekeeper.~~ **Superseded 2026-10-28.**
- **Decision (Baz, 2026-10-28):** LK is standalone with **its own sign-in** (Supabase Auth on LK's project: Google,
  Microsoft, email link). For a school that has both products, FVK is a **bridge**, not the gatekeeper: a coordinator
  signed in to FVK opens LK already signed in. A school without FVK signs in to LK directly. Same work email = same
  LK user. Sign-in screen exists as a mock in LK (every option opens the demo school); see `docs/AUTH.md`.
- **What this means for FVK:** the bridge below is still the only FVK-side auth work, and it is still the hard stop
  for linking real schools. FVK does **not** need to manage LK users, roles or schools — LK owns those.
- **Bridge design (LK side builds the verifier once you agree the format):**
  1. FVK mints a short-lived signed token: school id, user id, role, expiry.
  2. FVK passes it to the panel (query string or `postMessage` after `lk:ready`).
  3. An LK edge function verifies the signature and returns a session scoped to that school.
  4. `lk_*` functions read school and user from that session; the demo fallback survives only for the mock harness.
- **Needed from you:** how people sign in to FVK today (email + password, Google, Microsoft — decides whether a
  linked school's staff can also use the same provider on LK directly); signing method (shared secret or public key), role names, which origin(s) to trust, and a test school plus test user. LK builds the verify side against whatever you choose.

### 4.2 Per-school switch
`FEATURES.lektionskollen` is a global build-time boolean. A paid add-on needs a per-school switch (tier or column). Out of scope for the first patch; decide with Baz. [verify]

### 4.3 Data and cost
LK has its own model spend and its own quotas. No FVK data is stored in LK except the cover key (`lessonKey`) and the lesson facts listed in §2d. [carried-forward]

---

## 5. DECISIONS AND RATIONALE

- **Separate project, iframe panel** — switchable per school, metered separately, removable, shared plan pool is a different trust boundary from FVK's school-scoped RLS. [carried-forward from `fvk-integration/README.md`]
- **No pupil data crosses**, enforced by the function signature in `lesson-to-request.ts`. Adding a parameter is a decision.
- ~~**Trust FVK's login; no second login** (Baz, 2026-10-24).~~ Superseded.
- **LK is standalone, FVK link is optional** (Baz, 2026-10-28). LK has its own sign-in; FVK bridges its signed-in
  user so linked schools still sign in once. A school can buy either product alone. LK issue #159; plan in `docs/AUTH.md`.
- **Plan sharing is local by default** (Baz, 2026-10-28). Plans stay at their school; the cross-school pool takes only
  approved plans that are allowed to be shared, labelled AI-made or Teacher-made. No FVK impact. LK issue #158.
- **Footprint is deliberately small:** one button in the lesson popover, one line in the cover email, one optional sidebar entry.
- **Surgical rule (Baz):** LK must sit beside existing menus and features without overriding, consuming or interrupting any of them.
- **No hosted FVK copy.** Baz asked that FVK code not be placed in a new repo or public environment. The FVK zip stayed in a private sandbox; no FVK code was pushed anywhere.

---

## 6. ★ CONVENTIONS SELF-AUDIT (against `CONVENTIONS-2026-07-07.md`; LK side only)

- **DAL (A1):** new FVK files do not query FVK's database; they call LK's RPC through its own client. → no violation, `[verify]`
- **Server/Client (A2):** button, panel and hook are `'use client'` and need interactivity. → fine.
- **RLS-mirrors-UI (A3):** no FVK table or policy is touched. → n/a
- **Migrations (A4):** no FVK migration. A per-school flag (§4.2) would need one. → n/a for now
- **300-line ceiling (B1):** the new files are under 100 lines. The existing popover is over 300 already. → declared above.
- **No `any` (B2):** none introduced. → `[verify]`
- **`lib/` tests (B3):** the pure modules have tests; the hook does not. → **gap, declared in §3a.**
- **i18n (B5):** the components carry inline Swedish/English instead of `t()` keys. → **drift; move to `t()` or log it.**
- **PR discipline (C1/C2):** split into small PRs (§8).
- **Prove-don't-claim (C3):** nothing was run in FVK. → stated in §1.

---

## 7. TEST CHECKLIST (for Gareth)

Automated, with the flag **off**:
- `npx tsc --noEmit`, lint, `npx vitest run` — **no new failures** compared with `dev`.
- A render test proving the popover output is unchanged with the flag off.

Manual, with the flag **on**, against a test school and test user:
1. The button shows in the assigned, uncovered and past-lesson popovers and **not** on a cancelled lesson.
2. Existing popover actions still work: assign, remove cover, notify, uncancel, reason panel.
3. Right-click menus on the grid, timeline and daily tab behave exactly as before.
4. Open the panel, press Escape, click outside, press ✕: it closes every time, and focus returns to the popover.
5. The panel layer sits above the popovers and does not break their click-outside closing.
6. A message from a **foreign origin** is ignored once the origin check is in.
7. Browser console: no CSP violation reports. Check the Sentry CSP report URI too.
8. With any of the three env vars missing, the button does not render and nothing errors.
9. Mobile width, keyboard-only use, and Swedish/English switching.
10. The panel opens the correct lesson (subject, year, group, times, teacher names) and no pupil data appears in the URL.

---

## 8. SUGGESTED PR SPLIT (FVK conventions: each PR tells one story)

1. Flag + new files, nothing rendered (`features.ts`, button, panel, hook, client) with tests.
2. Popover hook (`grid-block-popover.tsx`) behind the flag.
3. CSP `frame-src` for the LK origin + the origin check on messages.
4. Auth handshake (§4.1) — only after the signing format is agreed.
5. Optional: sidebar entry, email line (only when `coverEmailNotify` is turned on).

---

## 9. STILL IN THE HUMAN'S HANDS (Baz)

- Tell Gareth, and agree the token format and role names (§4.1).
- Tell Gareth that LK is now standalone with its own sign-in (2026-10-28) — FVK only bridges, it does not own LK users.
- Find out how FVK sign-in works today (provider) — open question in §4.1 and `docs/AUTH.md`.
- Decide the per-school switch (§4.2) and whether any menu other than the lesson popover needs an LK entry (§3b).
- Provide the LK anon key for the three env vars when a test environment exists.
- Commit this handover; update the human-authorship log.

---

## 10. HOW TO CONTACT THE LK SIDE

The work is broken into FVK issues in `docs/FVK-ISSUES-lektionskollen.md` (one epic, eight issues).

LK issues live in `franvarokollen/lektionskollen`: **#137** (FVK integration), **#159** (standalone sign-in + FVK bridge, replaces the auth decision in #137), **#158** (sharing model, no FVK impact), **#148** (teacher-note translation, unrelated).
Reference commits: LK `main` `b00927c`. LK repo paths cited here: `fvk-integration/`, `app-src/lk.ts` (strict TypeScript; embed mode `EMBED` / `toParent` / `openEmbed`, lines ~1045–1090; built to `app/lk.js`, never edit the build output), `supabase/migrations/20261021i_plan_for_cover.sql`.

Note for FVK reviewers: the LK screens (coordinator app, substitute page, plan renderer) are strict TypeScript in `app-src/`, built with esbuild into `app/*.js`. `npm run check:app` runs typecheck, build-freshness, i18n and projector-answer checks.

---

## 11. CHANGE LOG — this is a living document

Kept current by the LK sessions as decisions land. Newest first. Each entry says what changed for FVK.

| Date | Change | FVK impact |
|---|---|---|
| 2026-10-28 | LK becomes a **standalone product** with its own sign-in; FVK link is an optional bridge (LK #159, `docs/AUTH.md`) | Auth work is still only the bridge (§4.1); FVK no longer acts as gatekeeper for LK users. New question: which sign-in provider FVK uses |
| 2026-10-28 | **Plan sharing local by default**, AI-made / Teacher-made labels (LK #158) | None |
| 2026-10-28 | LK plan panel gets a navy title band (LK #161) | Visual only, inside the iframe |
| 2026-10-24 | First version of this handover | — |


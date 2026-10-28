# Issues to open in Frånvarokollen — Lektionskollen add-on

For Gareth (and his AI session). One epic and eight issues, each telling one story, in the order they should be worked.
Background and verified facts: `docs/HANDOVER-FVK-INTEGRATION.md` in the Lektionskollen repo — **read it first**; every
issue below points at its sections. Labels and milestone are left to you (the LK side doesn't know FVK's label set).
Create each issue with the title as written; paste everything under **Body**. The `#1`–`#8` references are this file's own numbering: replace them with the real issue numbers once created.

Rule for all of them: **add, never replace.** With the flag off, FVK renders and behaves exactly as today.

---

## EPIC — Lektionskollen add-on (AI lesson plans for covered lessons)

**Body**

Lektionskollen (LK) is a separate product (own Supabase project, own deployment, own sign-in since 2026-10-28) that a
school can buy alone or link to FVK. This epic tracks the FVK side of the link: FVK bridges its signed-in user into LK
so linked schools sign in once.

- Handover: `HANDOVER-FVK-INTEGRATION.md` (LK repo, `docs/`).
- Footprint in FVK: one button in the lesson popover, one CSP allowance, one optional sidebar entry, one optional email line.
- Nothing about a pupil ever crosses (enforced by the signature of `lesson-to-request.ts`).
- **Hard stop:** the add-on must not be enabled for any real school until #5 (auth handshake) ships.

Children: #1 (flag and files), #2 (popover button), #3 (CSP and origin checks), #4 (surface map), #5 (auth), #6 (per-school switch), #7 (email line), #8 (sidebar, optional).

Decision record: ~~(Baz, 2026-10-24) LK has no login of its own; it trusts FVK's login.~~ Superseded by (Baz,
2026-10-28): LK is standalone with its own sign-in; the FVK link is an optional bridge. See LK `docs/AUTH.md`, LK issue #159.

---

## 1. feat(lektionskollen): feature flag, config and new files (nothing rendered)

**Body**

**Story.** Land the add-on's building blocks with the flag off, so later PRs are small and nothing changes for any school.

**Scope**
- `src/lib/config/features.ts` — add `lektionskollen: false` with a doc comment.
- NEW `src/lib/lektionskollen/client.ts` (LK Supabase client; returns null when env vars are missing).
- NEW `src/lib/lektionskollen/use-lesson-plan.ts`.
- NEW `src/app/cover/lesson-plan-button.tsx`, `src/app/cover/lesson-plan-panel.tsx`.
- Env: `NEXT_PUBLIC_LEKTIONSKOLLEN_URL`, `NEXT_PUBLIC_LEKTIONSKOLLEN_ANON_KEY`, `NEXT_PUBLIC_LEKTIONSKOLLEN_APP_URL`. Any missing → the button renders nothing.
- Source files: LK repo `fvk-integration/` (re-verify against live `dev`; it was written against an older snapshot).

**Not in this PR.** Any hook into the popover (see #2), CSP (see #3).

**Conventions to check.** B3: add a test for `use-lesson-plan.ts` (the `lib/` hook has none today). B5: the components carry inline Swedish/English; move to `t()` or log it in `KNOWN-DRIFT.md`. No new `any`.

**Acceptance**
- `npx tsc --noEmit`, lint and `npx vitest run` pass with no new failures against `dev`.
- With the flag off, or any env var missing, nothing renders and nothing errors.

---

## 2. feat(cover): Lesson plan button in the lesson popover (flag-gated)

**Body**

**Story.** One button in the lesson popover that opens the LK panel. This is the add-on's whole footprint on the cover screen.

**Scope**
- `src/app/cover/grid-block-popover.tsx` — build `planLesson` once next to `emailCtx`; render `<LessonPlanButton … />` in the assigned, uncovered and `isPast` branches. **Not** in the cancelled branch. About 15 lines.
- The file is already 413 lines (ceiling ~300): keep the diff minimal and log it in `KNOWN-DRIFT.md` if it grows.
- Depends on #1.

**Behaviour contract.** With the flag off the popover is byte-for-byte unchanged. Existing actions (assign, remove, notify, uncancel, reason panel) behave exactly as before.

**Acceptance**
- A render test: flag off → identical popover output.
- Manual: button shows in the three branches only; every existing popover action still works; Escape, ✕, and click-outside close the panel and return focus to the popover; the panel layers above popovers without breaking their click-outside closing.

---

## 3. security(lektionskollen): CSP frame-src, message origin checks

**Body**

**Story.** The panel is an iframe, and FVK's CSP currently forbids frames. Allow exactly the LK origin, and make the message handlers verify who is talking.

**Scope**
- `src/lib/security/csp.ts` — `frame-src 'none'` becomes `frame-src <LK origin>` (derived from `NEXT_PUBLIC_LEKTIONSKOLLEN_APP_URL`; stays `'none'` when unset). Update `csp.test.ts`.
- Confirm the `X-Frame-Options: DENY` header (same file) applies only to FVK's own pages, not to the LK iframe.
- `lesson-plan-panel.tsx` and `use-lesson-plan.ts` — accept a message only if `e.origin === new URL(lektionskollenBase()).origin` and `e.source` is the panel's `contentWindow`. Add tests.
- **Security review: Gareth.** This was missing from the earlier integration notes.

**Acceptance**
- Unset env → CSP unchanged from today (assert in `csp.test.ts`).
- A message from a foreign origin is ignored (test).
- No CSP violations in the console or the Sentry report URI when the panel opens.

---

## 4. chore(lektionskollen): map every lesson surface; decide where the add-on appears

**Body**

**Story.** Only the lesson popover is covered so far. FVK also handles right-click and lesson interaction elsewhere. Decide, surface by surface, whether the add-on needs an entry. **Default: the lesson popover only.**

**Surfaces to review** (context-menu or lesson handling found by grep)
`timeline-grid-view.tsx`, `timeline-view.tsx`, `daily-tab.tsx`, `absent-panel.tsx`, `cover-client.tsx`, `staff-context-menu.tsx`, `staff-chip-strip.tsx`, `suppressed-block-popover.tsx`, `long-term-absence-panel.tsx`, `use-cover-state.ts`.

**Output.** A short table: surface, what a click/right-click does today, is there a safe spot for an LK entry, decision (add / no), and who decided (Baz and Gareth). No code in this issue.

**Rule.** Any entry added must sit beside existing ones without overriding, consuming or interrupting them.

---

## 5. feat(auth): signed token bridge from FVK to Lektionskollen — **blocks linking real schools**

**Body**

**Story.** LK has its own sign-in (since 2026-10-28), but a coordinator already signed in to FVK should not have to
sign in again. FVK hands its signed-in user to LK; LK maps it to its own user by work email. Today the panel runs on LK's anonymous key and falls back to LK's demo school. Enabling it for a real school before this ships would not scope lookups to that school (two schools with the same `lessonKey` could see each other's plan status).

**Design (LK side builds the verifier once the format is agreed)**
1. FVK server route mints a short-lived signed token: school id, user id, role, expiry. Uses the user's existing FVK session.
2. FVK passes it to the panel (query string or `postMessage` after `lk:ready`).
3. LK edge function verifies the signature and returns a session scoped to that school.
4. LK's `lk_*` functions read school and user from that session. The demo fallback stays only for the mock harness.

**Decisions needed from Gareth**
- Signing method: shared secret or public key (recommendation: asymmetric, so FVK holds the only private key).
- Role names that cross, and token lifetime.
- Which origin(s) to trust.
- A test school and test user to develop against.

**Acceptance**
- A user of school A cannot read or create plans for school B through the panel (cross-tenant test, in the style of the existing RLS suites).
- An expired or tampered token is rejected.
- Pupil data is not in the token or the URL.

---

## 6. feat(tiers): per-school switch for the add-on

**Body**

**Story.** `FEATURES.lektionskollen` is a global build-time boolean. A paid add-on needs a per-school switch, as the note at the top of `features.ts` already anticipates ("these will be driven by school tier").

**Needs a product decision first** (Baz): tier, column, or manual enablement. Likely a migration; follow A4 (migrations as truth) and add RLS and tests. Depends on #5.

---

## 7. feat(cover): lesson plan line in the cover email (only when `coverEmailNotify` is on)

**Body**

**Story.** The substitute already receives an email naming the lesson; the approved plan belongs in it.

**Scope**
- In the popover caller, append `planEmailLine({ sv, url, title, approved })` to the single email body. **Keep `notify-email.ts` zero-import.**
- `planEmailLine` returns an empty string unless the plan is approved, so an unapproved plan is never sent.
- `FEATURES.coverEmailNotify` is `false` today, so this ships dormant until that flag is turned on. Depends on #2.

**Acceptance.** Test: unapproved plan → email unchanged. Approved plan → one added paragraph, Swedish or English to match.

---

## 8. (optional) feat(nav): "Lesson plans" sidebar entry

**Body**

**Story.** The plan bank, the feedback queue and the add-on's settings do not belong in a day grid. An optional sidebar entry gated like Radar and Hub, pointing at `/lessons`, which can start as a one-line page embedding LK without `embed=1`.

**Scope.** `sidebar.tsx` (one gated item), `translations.ts` (`nav.lessons`), a `/lessons` route. **Not needed for the button to work.** Depends on #1, #5 and #6.

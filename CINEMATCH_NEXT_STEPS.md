# CineMatch Next Steps

Use this file as the short, execution-first roadmap.

## Current status snapshot (Apr 2026)

- Done: profile photos are stored in Supabase Storage and profile rows keep the URL.
- Done: onboarding preferences exist in app state and affect Discover ordering.
- Done: admin dashboard route/page exists (`/admin`) and reads live Supabase data.
- Still missing: Next.js `error.tsx` / `global-error.tsx`.
- Still missing: API payload validation with Zod (or equivalent schema layer).
- Still missing: test script + CI workflow gate.
- Still risky: hardcoded admin credentials exist in both client page and API route.

## Phase 1 — Ship blockers (do now)

- [ ] **Harden admin auth path**: remove hardcoded admin email/password from code, move to server env secrets, gate with server-side role checks, and add basic admin audit metadata.
- [ ] **Add route error boundaries**: implement `error.tsx` for app routes and `global-error.tsx` to prevent white-screen runtime crashes.
- [ ] **Validate all API input**: add shared request schema validation for `src/app/api/*` and return consistent typed error payloads.
- [ ] **Add minimum test safety net**: create `npm test` baseline (auth login, invite accept, swipe/undo) and run it in CI with lint + typecheck.
- [ ] **Fix auth shell empty-frame**: replace `ProtectedScreen`'s final `return null` path with a tiny redirect/loading state.

## Phase 2 — Reliability and data trust

- [ ] **Offline UX**: add online/offline banner and optional retry queue for failed sync/swipe/invite actions.
- [ ] **Persist achievements in DB**: store unlocked achievements server-side so they survive sign-out/device switch.
- [ ] **Invite lifecycle states**: support `sent`, `opened`, `accepted`, `expired`, plus resend/revoke actions.
- [ ] **Split `app-state.tsx`**: extract auth/session, sync, discover queue, and social actions into focused modules/hooks.

## Phase 3 — Product quality and growth

- [ ] **Discover explainability**: add "Because you liked..." reason chips and better genre rotation to reduce repetition.
- [ ] **Shared planning tools**: add filters (`shared + unwatched`), planning tags, and short shared notes.
- [ ] **Long-list performance**: virtualize Picks/Shared/search lists when item counts regularly exceed ~50.
- [ ] **Observability**: add client error tracking (for example Sentry) and correlation IDs on API errors.
- [ ] **Compliance basics**: add privacy/terms pages before broader public rollout.

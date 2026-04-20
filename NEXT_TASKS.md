<!-- Agents: keep this file in English. Do not commit or push this file unless the user explicitly asks. -->

# Your next tasks — CineMatch

## Summary

**Apr 2026 — current `main`:** Error boundaries, **ProtectedScreen**, **admin** hardening, **Supabase `processLock`**, **offline banner** + sync retry, **Vitest** + **GitHub Actions CI**, **skip link** + `#main-content`, **Zod** on login/signup (`auth-form-schemas`), **`/auth/callback`** safe-area + **Try again**, **Picks trailer** closes on **Escape**, landing **Privacy / Terms** footer. ESLint ignores `android/**`; a few `react-hooks/*` rules are warnings so CI stays green.

**Still worth doing:** split `app-state`, list virtualization, deeper modal focus traps, observability, manual deep QA on slow networks.

---

## Done (don’t re-ticket)

- [x] **API:** Zod + shared error shape on `src/app/api/**/route.ts`.
- [x] **Auth copy / landing:** No misleading demo CTA; Supabase vs local explained; **Privacy · Terms** links on `/`.
- [x] **Errors:** `error.tsx` + `global-error.tsx` + shared fallback.
- [x] **ProtectedScreen:** Redirect spinner + copy when logged out.
- [x] **Admin:** Session + Bearer; `ADMIN_*`; `INITIAL_SESSION`; English gates; `processLock` client fix.
- [x] **Offline UX:** `OfflineBanner` + `useOnlineStatus`; dismiss; **retry `account-sync`** when back online (`offline-banner.tsx`).
- [x] **Tests + CI:** `npm test` (Vitest) + `src/lib/match-score.test.ts`; **`.github/workflows/ci.yml`** — `lint`, `tsc --noEmit`, `test`.
- [x] **Icons / PWA:** `manifest.ts` + `public/icons/` + optional `NEXT_PUBLIC_APP_ICON_URL` (`pwa-app-icons.ts`).
- [x] **Skip link:** “Skip to main content” in **`AppShell`** → `#main-content` on the scroll region.
- [x] **`/auth/callback`:** Safe-area padding; **Try again** (re-runs session exchange) when the error is from the client flow (not OAuth `error` query params).
- [x] **Trailer modal:** **Escape** closes (`PicksTrailerModal`).
- [x] **Client forms:** Zod — `loginFormSchema` / `signupFormSchema` in `src/lib/auth-form-schemas.ts`, used on `/` and `/signup`.

---

## Next tasks (priority)

1. [ ] **Split `app-state.tsx`** — Extract auth, sync, discover into smaller modules/hooks.
2. [ ] **Long lists** — Virtualize Picks / Shared / Discover search at scale.
3. [ ] **Nested modals** — Full focus-trap / stacking audit (details + trailer + sheets).
4. [ ] **Deep QA** — `discover?movieId=…`, invites, OAuth on slow/offline (manual checklist).
5. [ ] **Observability (optional)** — Sentry + API correlation ids.
6. [ ] **Repo hygiene** — Keep working tree clean; avoid committing `android/**` build artifacts.

---

_Maintainer: English only. Updates to this file do not need to be committed or pushed unless you ask._

_Last updated: Apr 2026 — complements `IMPROVEMENT_CHECKLIST.md`._

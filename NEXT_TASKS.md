<!-- Agents: keep this file in English. Do not commit or push this file unless the user explicitly asks. -->

# Your next tasks — CineMatch

## Summary

**Apr 2026 — `main` is up to date with:** error boundaries, ProtectedScreen, admin + `processLock`, offline banner + sync retry on reconnect, Vitest + GitHub Actions CI, skip link → `#main-content`, Zod login/signup, `/auth/callback` safe-area + Try again, trailer **Escape** to close, landing Privacy/Terms, ESLint ignoring `android/**`, **Picks list virtualization** (long Queue/Watched), **modal focus-trap + nested z-index**, **`x-request-id` on API responses**, **`docs/MANUAL_QA.md`**, root **`.gitignore`** for Android build dirs, **partial `app-state` split** (`auth-session-storage`).

**Still open (optional / follow-up):** further split of `app-state` (sync, discover); virtualize Shared / Discover search if needed; optional Sentry install; sheet modals audit if gaps remain.

---

## Done (tick = shipped — don’t re-ticket)

- [x] **API:** Zod + shared error shape on `src/app/api/**/route.ts`.
- [x] **Auth copy / landing:** No misleading demo CTA; Supabase vs local; **Privacy · Terms** on `/`.
- [x] **Errors:** `error.tsx` + `global-error.tsx` + shared fallback.
- [x] **ProtectedScreen:** Redirect spinner + copy when logged out.
- [x] **Admin:** Session + Bearer; `ADMIN_*`; `INITIAL_SESSION`; English gates; `processLock`.
- [x] **Offline UX:** `OfflineBanner` + dismiss; retry **account-sync** when back online.
- [x] **Tests + CI:** `npm test` (Vitest) + smoke test; `.github/workflows/ci.yml` (`lint`, `tsc`, `test`).
- [x] **Icons / PWA:** `manifest.ts` + `public/icons/` + optional `NEXT_PUBLIC_APP_ICON_URL`.
- [x] **Skip link:** “Skip to main content” in `AppShell` → `#main-content`.
- [x] **`/auth/callback`:** Safe-area; **Try again** for client-side exchange errors.
- [x] **Trailer modal:** **Escape** closes (`PicksTrailerModal`).
- [x] **Client forms (Zod):** `loginFormSchema` / `signupFormSchema` on `/` and `/signup`.
- [x] **ESLint / CI hygiene:** Ignore `android/**`; `react-hooks/refs` + `set-state-in-effect` as **warnings** so CI stays green.
- [x] **Split `app-state` (partial):** Auth session storage in `src/lib/auth-session-storage.ts` (sync + discover still live in `app-state.tsx`).
- [x] **Long lists:** Virtualize **Picks** Queue + Watched at scale (`VirtualScrollList`, threshold 24).
- [x] **Nested modals:** Focus-trap + `--z-modal-nested` for details + trailer; `inert` under nested trailer.
- [x] **Deep QA:** Manual checklist in `docs/MANUAL_QA.md`.
- [x] **Observability:** `x-request-id` via middleware + JSON helpers; `instrumentation.ts` stub for optional Sentry wizard.
- [x] **Repo hygiene:** Root `.gitignore` entries for `android/**` Gradle build outputs.

---

## Next tasks (not done yet — `[ ]`)

1. [ ] **Finish `app-state` split** — Extract sync + discover into dedicated modules/hooks (auth slice already extracted).
2. [ ] **Long lists (remaining)** — Virtualize Shared / Discover search if lists grow large enough to matter.
3. [ ] **Sheets / overlays audit** — Confirm focus + stacking for bottom sheets / menus if any UX gaps vs modals.
4. [ ] **Optional Sentry** — Run `@sentry/wizard` and set `NEXT_PUBLIC_SENTRY_DSN` when you want client/server error reporting.

---

_Maintainer: English only. Git: only commit/push this file if you ask._

_Last updated: Apr 2026 — complements `IMPROVEMENT_CHECKLIST.md`._

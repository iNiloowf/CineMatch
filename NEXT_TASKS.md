<!-- Agents: keep this file in English. Do not commit or push this file unless the user explicitly asks. -->

# Your next tasks — CineMatch

## Summary

**Apr 2026 — `main` ships:** error boundaries, ProtectedScreen, admin + `processLock`, offline banner + account-sync retry, Vitest + CI, skip link → `#main-content`, Zod forms, `/auth/callback` safe-area + retry, trailer **Escape**, Privacy/Terms, ESLint + `android/**`, **Picks virtualization**, **modal focus-trap + nested z-index**, **`x-request-id`**, **`docs/MANUAL_QA.md`**, Android **`.gitignore`**, **`auth-session-storage`**, **thumb-safe UI + safe-area**, **clearer sync/error copy + Back to sign in**, **lazy-loaded `/admin`** (`admin-loader` → `admin-client`). **Product:** English-only UI (no i18n backlog).

**Open work:** further `app-state` sync split, list virtualization outside Picks, overlay polish, images/CLS, automated tests, optional Sentry, release habits — see **Next tasks**.

---

## Done (tick = shipped — don’t re-ticket)

- [x] **API:** Zod + shared error shape on `src/app/api/**/route.ts`.
- [x] **Auth copy / landing:** No misleading demo CTA; Supabase vs local; **Privacy · Terms** on `/`.
- [x] **Errors:** `error.tsx` + `global-error.tsx` + shared fallback.
- [x] **ProtectedScreen:** Redirect spinner + copy when logged out; sync failure UI with **Retry** + **Back to sign in**.
- [x] **Admin:** Session + Bearer; `ADMIN_*`; `INITIAL_SESSION`; English gates; `processLock`; dashboard **code-split** (`admin-loader` / `admin-client`).
- [x] **Offline UX:** `OfflineBanner` + dismiss; retry **account-sync** when back online; **44px** dismiss target.
- [x] **Tests + CI:** `npm test` (Vitest) + smoke; `.github/workflows/ci.yml` (`lint`, `tsc`, `test`).
- [x] **Icons / PWA:** `manifest.ts` + `public/icons/` + optional `NEXT_PUBLIC_APP_ICON_URL`.
- [x] **Skip link:** “Skip to main content” in `AppShell` → `#main-content`.
- [x] **`/auth/callback`:** Safe-area; **Try again** for client-side exchange errors.
- [x] **Trailer modal:** **Escape** closes (`PicksTrailerModal`).
- [x] **Client forms (Zod):** `loginFormSchema` / `signupFormSchema` on `/` and `/signup`.
- [x] **ESLint / CI hygiene:** Ignore `android/**`; hooks rules as **warnings** where needed for green CI.
- [x] **Split `app-state` (partial):** Auth session in `src/lib/auth-session-storage.ts` (sync + discover still in `app-state.tsx`).
- [x] **Long lists (Picks):** Virtualize **Queue** + **Watched** (`VirtualScrollList`, threshold 24).
- [x] **Nested modals:** Focus-trap + `--z-modal-nested`; `inert` under nested trailer.
- [x] **Deep QA:** Manual checklist in `docs/MANUAL_QA.md`.
- [x] **Observability:** `x-request-id` (middleware + JSON helpers); `instrumentation.ts` stub for optional Sentry.
- [x] **Repo hygiene:** Root `.gitignore` for `android/**` Gradle build dirs.
- [x] **English-only scope:** No localization / RTL backlog.
- [x] **Small-screen & thumb reach:** `AppShell` top **safe-area**; **44px** bottom-nav targets + `touch-manipulation`; **NetworkStatusBlock** full-width actions on narrow viewports.
- [x] **Copy & recovery UX:** Clearer account-sync strings in **`app-state`**; error boundary titles; Connect/Profile failure copy; profile save error mentions connection.
- [x] **Bundle / admin:** Non-admin routes avoid loading the admin dashboard JS until `/admin` is opened.
- [x] **Discover split from `app-state`:** `src/lib/discover-quality.ts` (thresholds) + `src/lib/discover-queue.ts` (`buildDiscoverQueue`); deck logic no longer inlined in the provider. **Account sync** remains in `app-state.tsx` for a future extraction.
- [x] **Shared discover quality:** `passesDiscoverQualityThreshold` / runtime parsing — single module used by the client deck and `GET /api/movies` so mock/TMDB filtering does not drift.
- [x] **Route status UI:** `AppRouteLoading`, `AppRouteEmptyCard`, `AppRouteNetworkStatus` (`src/components/app-route-status.tsx`) — shared skeleton/spinner, empty cards, and centered `NetworkStatusBlock` shells on ProtectedScreen, Profile, Shared, Picks, and Discover empty-deck flows.

---

## Next tasks (not done yet — `[ ]`)

### Architecture & data

1. [ ] **Further split `app-state.tsx` (sync)** — Extract account-sync browser fetch, settings row helpers, and related Supabase glue into focused hooks/modules; keep provider thin.

### UX & UI

2. [ ] **Virtualize Shared + Discover search** — Same virtual-list approach as Picks when result sets get large.
3. [ ] **Sheets, popovers, menus** — Pass on focus order, **Escape**, and tap-outside for bottom sheets, dropdowns, and toolbar menus vs the global z-index scale.
4. [ ] **Images & CLS** — `next/image` or fixed aspect ratios for posters/heroes; fewer layout jumps on route and modal open.
5. [ ] **Micro-feedback** — Toasts, disabled buttons, and “saving / synced” labels consistent for every destructive or slow action.

### Engineering & quality

6. [ ] **Bundle checks** — Run **`npm run analyze`** after large UI or dependency changes; watch First Load JS on Discover/Picks.
7. [ ] **Automated regression tests** — Integration or E2E: login → swipe → undo; invite create/accept; account-sync happy path (Playwright or Vitest + MSW).
8. [ ] **Optional Sentry** — `@sentry/wizard` + `NEXT_PUBLIC_SENTRY_DSN` when you have production traffic; correlate with **`x-request-id`**.

### Release & platform

9. [ ] **Android smoke** — Per meaningful release: `cap sync`, device install, Discover / Picks / modals / safe areas (see `docs/MANUAL_QA.md`).
10. [ ] **Capacitor store readiness** — Icons, splash, version codes, and permission strings before Play submission.
11. [ ] **Next.js `middleware` → `proxy`** — Track [Next.js guidance](https://nextjs.org/docs/messages/middleware-to-proxy); migrate when your version’s migration path is clear (currently a deprecation warning in builds).

---

_Maintainer: English only. Git: only commit/push this file if you ask._

_Last updated: Apr 2026 — discover/quality/route-status items moved to Done; sync split remains open._

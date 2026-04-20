<!-- Agents: keep this file in English. Do not commit or push this file unless the user explicitly asks. -->

# Your next tasks — CineMatch

## Summary

**Apr 2026 — `main` is up to date with:** error boundaries, ProtectedScreen, admin + `processLock`, offline banner + sync retry on reconnect, Vitest + GitHub Actions CI, skip link → `#main-content`, Zod login/signup, `/auth/callback` safe-area + Try again, trailer **Escape** to close, landing Privacy/Terms, ESLint ignoring `android/**`, **Picks list virtualization** (long Queue/Watched), **modal focus-trap + nested z-index**, **`x-request-id` on API responses**, **`docs/MANUAL_QA.md`**, root **`.gitignore`** for Android build dirs, **partial `app-state` split** (`auth-session-storage`), **small-screen touch targets + top safe-area**, **clearer sync/error copy + recovery paths**, **admin route code-split** (`dynamic` + `admin-client`).

**Still open:** see **Next tasks** — remaining UI polish, broader patterns, tests, optional Sentry (English-only product; no localization backlog).

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
- [x] **English-only scope:** All user-facing copy stays in English; no i18n/RTL backlog.
- [x] **Small-screen & thumb reach:** Top **safe-area** padding on `AppShell`; **44px** nav targets + `touch-manipulation`; full-width status actions on narrow viewports; **44px** offline dismiss control.
- [x] **Copy & recovery UX:** Clearer account-sync errors in **`app-state`**, error boundary titles, Connect/Profile errors; sync failure adds **Back to sign in** next to **Retry** on **`ProtectedScreen`**.
- [x] **Bundle / admin split:** **`/admin`** loads via **`admin-loader.tsx`** (`next/dynamic` → **`admin-client.tsx`**) so non-admin routes avoid the admin dashboard bundle.

---

## Next tasks (not done yet — `[ ]`)

1. [ ] **Finish splitting `app-state.tsx`** — Move sync and discover logic into focused hooks/modules so screens re-render less and the shell is easier to reason about and test.
2. [ ] **Unified loading / empty / error patterns** — Same visual language for spinners, “nothing here yet,” and retry actions across Discover, Picks, Shared, and profile-adjacent flows so the app never feels accidental or blank.
3. [ ] **Virtualize long lists outside Picks** — Apply the same virtual list approach to **Shared** and **Discover** search when lists are large enough to scroll-jank on mid-range phones.
4. [ ] **Sheet and popover pass** — Verify focus trap, Escape, and tap-outside behavior for bottom sheets, menus, and toolbars so nothing feels “stuck” under overlays.
5. [ ] **Images and layout stability** — Use `next/image` (or consistent dimensions) for posters and heroes where it helps; reduce layout shift (CLS) on route and modal transitions.
6. [ ] **Micro-feedback consistency** — Align success and error toasts, button disabled states, and “saved / syncing” indicators so every action has clear immediate feedback.
7. [ ] **Bundle analysis habit** — Run **`npm run analyze`** after large feature work to catch accidental regressions in client bundle size.
8. [ ] **Automated regression tests** — Add integration or E2E coverage for login → swipe → undo, invite flow, and account sync so refactors don’t break core journeys.
9. [ ] **Production errors (optional)** — Wire **Sentry** via the official wizard when you have real traffic; keep **`x-request-id`** in mind when debugging API issues.
10. [ ] **Android smoke path** — After web changes, **`cap sync`**, install on a real device, and verify Discover, Picks, modals, and safe areas once per meaningful release.

---

_Maintainer: English only. Git: only commit/push this file if you ask._

_Last updated: Apr 2026 — complements `IMPROVEMENT_CHECKLIST.md`._

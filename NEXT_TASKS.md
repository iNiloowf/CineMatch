<!-- Agents: keep this file in English. Do not commit or push this file unless the user explicitly asks. -->

# Your next tasks — CineMatch

## Summary

**Apr 2026 — `main` is up to date with:** error boundaries, ProtectedScreen, admin + `processLock`, offline banner + sync retry on reconnect, Vitest + GitHub Actions CI, skip link → `#main-content`, Zod login/signup, `/auth/callback` safe-area + Try again, trailer **Escape** to close, landing Privacy/Terms, ESLint ignoring `android/**`, **Picks list virtualization** (long Queue/Watched), **modal focus-trap + nested z-index**, **`x-request-id` on API responses**, **`docs/MANUAL_QA.md`**, root **`.gitignore`** for Android build dirs, **partial `app-state` split** (`auth-session-storage`).

**Still open:** see **Next tasks** below — architecture splits, broader list virtualization, automated tests beyond unit smoke, native/PWA polish, and optional legal/analytics. **Product language:** English-only UI; no localization or RTL work is planned unless requirements change.

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

---

## Next tasks (not done yet — `[ ]`)

### Architecture & data

1. [ ] **Finish `app-state` split** — Extract sync + discover into dedicated modules/hooks (auth lives in `auth-session-storage` already).
2. [ ] **Shared filter / search helpers** — Deduplicate client + server movie/search logic where mock and TMDB paths diverge.

### UX & performance

3. [ ] **Long lists (remaining)** — Virtualize **Shared** and **Discover** search results when row counts routinely get large (same pattern as Picks).
4. [ ] **Sheets / overlays audit** — Focus order + stacking for bottom sheets, popovers, and menus vs modal stack (`globals.css` z-index scale).
5. [ ] **Images & perf budget** — Audit poster/hero loading (`next/image` where applicable), CLS, and run **`npm run analyze`** after large UI changes.

### Quality & operations

6. [ ] **Automated tests beyond smoke** — Integration or E2E for: login → discover swipe → undo; invite create/accept; account-sync happy path (tooling: Playwright or Vitest + MSW, your choice).
7. [ ] **Optional Sentry** — Run `@sentry/wizard` and set `NEXT_PUBLIC_SENTRY_DSN` for production error grouping (builds on `instrumentation.ts` stub).
8. [ ] **A11y CI gate (optional)** — `axe-core` or `@axe-core/react` in CI or pre-release script on critical routes.
9. [ ] **Deep links & cold start** — Scripted checks for `discover?movieId=…`, invite URLs, OAuth callback on throttled network (extend `docs/MANUAL_QA.md` or automate).

### Product & compliance (optional)

10. [ ] **PWA / install** — Revisit offline shell + cache strategy only if web install matters for users.
11. [ ] **Legal & analytics** — Cookie/consent flow if you add non-essential cookies or trackers; keep Privacy/Terms in sync with data practices.

### Native

12. [ ] **Android release checklist** — `cap sync`, signing, Play Console metadata, and one device smoke per release (see `docs/MANUAL_QA.md`).

---

_Maintainer: English only. Git: only commit/push this file if you ask._

_Last updated: Apr 2026 — complements `IMPROVEMENT_CHECKLIST.md`._

<!-- Agents: keep this file in English. Do not commit/push this file unless the user explicitly asks. -->

# CineMatch — Task list (organized)

**Stack:** Next.js 16, React 19, Supabase, Capacitor Android, Vitest + GitHub Actions CI. Request boundary: **`src/proxy.ts`**.

**Where to look:** shipped work = `main` · **Manual QA:** `docs/MANUAL_QA.md` · **Older UI history:** `IMPROVEMENT_CHECKLIST.md`

---

## A. Priority items 1–5 (done)

Each row: **what** → **note** (why it matters / where in repo).

| # | Task | Note |
|---|------|------|
| 1 | **Shrink `app-state.tsx` (sync path)** | Sync logic split into `src/lib/account-sync/` (`types`, `chunk-items`, `settings-fetch`, `fetch-from-browser`, `snapshot-storage`). Easier to test and maintain; more hook splits optional later. |
| 2 | **Stronger automated tests** | Vitest: `discover-quality.test.ts`, `discover-queue.test.ts`. MSW/Playwright-style integration tests still optional. |
| 3 | **Android + Play release discipline** | Runbook: `docs/RELEASE_CHECKLIST.md`. Versions live in `android/app/build.gradle` (bump each store upload). |
| 4 | **Bundle budget** | How-to: `docs/BUNDLE_BUDGET.md`. Command: `npm run analyze` after big UI/deps changes. |
| 5 | **Production monitoring** | `@sentry/nextjs` when `NEXT_PUBLIC_SENTRY_DSN` is set (`sentry.*.config.ts`, `instrumentation.ts`, `withSentryConfig` in `next.config.ts`). Pair with `x-request-id` in logs if you debug API issues. |

---

## B. Other shipped work (reference)

| Area | Note |
|------|------|
| Discover deck + API quality | `discover-quality.ts` + `discover-queue.ts`; `GET /api/movies` shares `passesDiscoverQualityThreshold`. |
| Route loading / empty / error | `AppRouteLoading`, `AppRouteEmptyCard`, `AppRouteNetworkStatus` on core routes. |
| **`middleware` → `proxy`** | `src/proxy.ts` — admin rewrite, `x-request-id`, cookie cleanup. |
| Play / Capacitor baseline | Splash, strings, `GOOGLE_PLAY_PUBLISHING.md` (see doc for store form). |
| Virtualized lists | Discover search & Shared partner lists when count ≥ 24 (`VirtualScrollList`). |
| Images & CLS | TMDB `remotePatterns`; `PosterBackdrop` + `next/image` where applicable. |
| Discover sheets | Tap-outside to close, dialog roles/labels for search & genre filter. |

---

## C. Optional next ideas (not committed as “must do”)

| Idea | Note |
|------|------|
| Landing “why sign in” line | Extra marketing on `/` if you want stronger conversion. |
| Settings toggle grouping | Group toggles by theme (partially done). |
| i18n / RTL | Only if you leave English-only; product is English today. |
| Cookie consent + analytics | If you add non-essential cookies or third-party trackers. |
| PWA install / offline shell | If web install matters beyond the Capacitor app. |
| More E2E / MSW tests | Login → swipe → invite flows; complements current Vitest unit tests. |

---

_Maintainer: English only. Git: only commit/push this file if you ask._

_Last updated: Apr 2026 — table layout for scan-friendly notes._

<!-- Agents: keep this file in English. Do not commit/push this file unless the user explicitly asks. -->

# Your next tasks — CineMatch

## Summary

**Stack:** Next.js 16, React 19, Supabase, Capacitor Android, Vitest + GitHub Actions CI. Request boundary: **`src/proxy.ts`**. Core routes implemented; APIs use Zod + shared helpers (`discover-quality`, `api-validation`).

**Shipped work** is on `main` (git history). **Manual QA:** `docs/MANUAL_QA.md`. Older UI notes: `IMPROVEMENT_CHECKLIST.md` (mostly historical).

### Completed (tick)

- [x] **Discover deck + API quality** — `src/lib/discover-quality.ts` + `src/lib/discover-queue.ts` (`buildDiscoverQueue`); `GET /api/movies` uses shared `passesDiscoverQualityThreshold` (no client/API drift).
- [x] **Route loading / empty / error** — `src/components/app-route-status.tsx` (`AppRouteLoading`, `AppRouteEmptyCard`, `AppRouteNetworkStatus`) wired on ProtectedScreen, Profile, Shared, Picks, Discover empty states.
- [x] Next.js **`middleware` → `proxy`** — `src/proxy.ts` (`export function proxy`: admin rewrite, `x-request-id`, stale `sb-*` cookies); see [Next.js 16 guidance](https://nextjs.org/docs/messages/middleware-to-proxy).
- [x] **Play Store / Capacitor baseline** — `versionCode` 2 / `versionName` 1.0.1; splash (`Theme.SplashScreen`, `splash.xml`, `SplashScreen.installSplashScreen`); `strings.xml` privacy/terms URLs + `permission_internet_description`; `docs/GOOGLE_PLAY_PUBLISHING.md`.
- [x] **Virtualize Discover search** — `VirtualScrollList` when `sortedSearchResults.length` ≥ 24 (`discover/page.tsx`); short lists stay a plain map.
- [x] **Virtualize Shared partner movies** — `SharedPartnerMovieCard` in `src/components/shared-partner-movie-card.tsx`; `VirtualScrollList` when a partner’s movie list ≥ 24; otherwise unchanged map.
- [x] **Images & CLS (TMDB)** — `next.config.ts` `images.remotePatterns` for `image.tmdb.org`; `PosterBackdrop` uses `next/image` for TMDB URLs, `<img>` fallback for other hosts.
- [x] **Discover sheets audit** — Search + genre filter: `useEscapeToClose` already; added **tap outside** on overlay to close, `stopPropagation` on sheet, `role="dialog"`, `aria-modal`, `aria-labelledby` for titles.

---

## Next tasks (open — priority only)

1. [x] **Shrink `app-state.tsx` (sync path)** — Extracted into `src/lib/account-sync/` (`types`, `chunk-items`, `settings-fetch`, `fetch-from-browser`, `snapshot-storage`). `app-state` imports these; optional further hook splits remain possible.

2. [x] **Stronger automated tests** — Unit tests added: `src/lib/discover-quality.test.ts`, `src/lib/discover-queue.test.ts` (Vitest). Integration/E2E (MSW/Playwright) still optional for later.

3. [x] **Android + Play release discipline** — Checklist: `docs/RELEASE_CHECKLIST.md`. `versionCode` / `versionName` bumped in `android/app/build.gradle` with this batch; follow checklist per release.

4. [x] **Bundle budget** — Documented: `docs/BUNDLE_BUDGET.md` (`npm run analyze`).

5. [x] **Production monitoring** — `@sentry/nextjs` added; `sentry.client.config.ts`, `sentry.server.config.ts`, `instrumentation.ts`; `next.config.ts` uses `withSentryConfig` when `NEXT_PUBLIC_SENTRY_DSN` is set. Correlate with `x-request-id` in server logs as needed.

---

_Maintainer: English only. Git: only commit/push this file if you ask._

_Last updated: Apr 2026 — Open list trimmed to priorities; optional analytics/PWA/Sentry-as-nice-to-have removed; release and monitoring called out explicitly._

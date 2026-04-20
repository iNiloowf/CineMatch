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

1. [ ] **Shrink `app-state.tsx` (sync path)** — Extract account-sync browser fetch, Supabase settings row reads/writes, and chunked hydration into `src/lib/account-sync/` (or focused hooks). Keeps the provider maintainable and easier to test.

2. [ ] **Stronger automated tests** — Add unit tests for `discover-quality` and `discover-queue`; add integration-style coverage for high-risk paths (e.g. account-sync or auth) using Vitest + MSW or a small Playwright smoke suite. CI already runs `npm test` — extend it, don’t replace it.

3. [ ] **Android + Play release discipline** — For each store-bound release: `npm run cap:sync`, install on a real device, run through `docs/MANUAL_QA.md`; bump `versionCode` / `versionName` in `android/app/build.gradle`; build a **signed release AAB**; in Play Console complete Data Safety, screenshots, and privacy policy URL (see `docs/GOOGLE_PLAY_PUBLISHING.md`). Keep upload keys and secrets out of git.

4. [ ] **Bundle budget** — After large dependency upgrades or heavy new routes, run `npm run analyze` and check First Load JS on Discover / Picks so regressions are visible early.

5. [ ] **Production monitoring (after you have traffic)** — When the app is live for real users, wire client + server error reporting (e.g. `@sentry/nextjs` + `NEXT_PUBLIC_SENTRY_DSN`) using the existing `instrumentation.ts` hook and `x-request-id` for correlation.

---

_Maintainer: English only. Git: only commit/push this file if you ask._

_Last updated: Apr 2026 — Open list trimmed to priorities; optional analytics/PWA/Sentry-as-nice-to-have removed; release and monitoring called out explicitly._

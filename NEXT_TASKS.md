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

## Next tasks (open)

### Architecture

1. [ ] **Shrink `app-state.tsx` (sync path)** — Extract account-sync browser fetch, settings row reads/writes, and chunked Supabase hydration into `src/lib/hooks/` or `src/lib/account-sync/`.

### Quality & operations

2. [ ] **Broader test coverage** — Unit tests for `discover-quality` / `discover-queue`; optional Playwright or Vitest + MSW for core flows.
3. [ ] **Optional Sentry** — `@sentry/wizard` + `NEXT_PUBLIC_SENTRY_DSN`; `instrumentation.ts` stub exists.
4. [ ] **Bundle checks** — `npm run analyze` after large UI/deps changes.

### Platform & release

5. [ ] **Android smoke** — `cap:sync`, device install, core flows + safe areas (`docs/MANUAL_QA.md`).

### Optional product

6. [ ] **Analytics / cookies** — If you add measurement; align with Privacy/Terms and consent rules.
7. [ ] **PWA / install** — If web install matters more than the native app.

---

_Maintainer: English only. Git: only commit/push this file if you ask._

_Last updated: Apr 2026 — Tasks 2–5 (virtualize Discover/Shared, TMDB images, sheet backdrop) marked complete._

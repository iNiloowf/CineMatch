<!-- Agents: keep this file in English. Do not commit or push this file unless the user explicitly asks. -->

# Your next tasks — CineMatch

## Summary

**Stack:** Next.js 16, React 19, Supabase, Capacitor Android, Vitest + GitHub Actions CI. Request boundary uses **`src/proxy.ts`** (Next.js 16 `proxy` convention) for admin entry rewrite, `x-request-id`, and stale Supabase cookie cleanup — replaces deprecated `middleware.ts`. Core app routes are implemented; APIs use Zod validation and shared helpers where introduced (`discover-quality`, `api-validation`).

**Shipped work** is on `main` (git history). **Manual QA:** `docs/MANUAL_QA.md`. Older UI pass notes: `IMPROVEMENT_CHECKLIST.md` (mostly historical).

### Completed (tick)

- [x] Next.js **`middleware` → `proxy`** — `src/proxy.ts` with `export function proxy` (admin entry rewrite, `x-request-id`, stale `sb-*` cookie cleanup); deprecated `src/middleware.ts` removed per [Next.js 16 guidance](https://nextjs.org/docs/messages/middleware-to-proxy).

---

## Next tasks (open)

### Architecture

1. [ ] **Shrink `app-state.tsx` (sync path)** — Extract account-sync browser fetch, settings row reads/writes, and chunked Supabase hydration into `src/lib/hooks/` or `src/lib/account-sync/` so `AppStateProvider` stays orchestration + state only.

### Performance & UX

2. [ ] **Virtualize Discover search results** — Search sheet still does `sortedSearchResults.map` for all rows (`discover/page.tsx`). Reuse `VirtualScrollList` + `shouldVirtualizeList` (same pattern as Picks) when results exceed the threshold.
3. [ ] **Virtualize Shared (optional)** — If linked groups × shared movies grow large, virtualize inner lists; Picks already virtualized.
4. [ ] **Images & CLS** — Prefer `next/image` or fixed aspect-ratio shells for posters and hero art to cut cumulative layout shift on slow loads.
5. [ ] **Sheets / menus audit** — Align Discover search sheet, genre filter sheet, and overflow menus with one focus/Escape/tap-outside story and the z-index scale (`--z-sheet`, `--z-modal`).

### Quality & operations

6. [ ] **Broader test coverage** — Today: `match-score.test.ts` + Vitest in CI. Add unit tests for `discover-quality` / `discover-queue`; optional Playwright (or Vitest + MSW) for login → swipe → undo and invite accept.
7. [ ] **Optional Sentry** — `instrumentation.ts` is an empty hook; run `@sentry/wizard` and set `NEXT_PUBLIC_SENTRY_DSN` when you have production traffic (correlate with `x-request-id`).
8. [ ] **Bundle checks** — Run `npm run analyze` after large dependency or route changes; watch First Load JS on Discover/Picks.

### Platform & release

9. [ ] **Android smoke** — Per meaningful release: `npm run cap:sync`, install, Discover / Picks / modals / safe areas (see `docs/MANUAL_QA.md`).
10. [ ] **Play Store / Capacitor** — Icons, splash, versionCode, user-facing permission strings, store listing URLs (privacy/terms).

### Optional product

11. [ ] **Analytics / cookies** — Only if you add measurement; align with Privacy/Terms and regional consent rules.
12. [ ] **PWA / install** — Revisit installability and offline shell if web install matters more than the native app.

---

_Maintainer: English only. Git: only commit/push this file if you ask._

_Last updated: Apr 2026 — `middleware.ts` migrated to `src/proxy.ts` (Next.js 16); item 11 ticked via Summary + removal from open list._

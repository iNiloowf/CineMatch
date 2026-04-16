# CineMatch Improvement Checklist

## Priority 0 (Do First)

- [x] Wire the top-right menu button in `src/app/(app)/discover/page.tsx` to a real action (open settings / quick actions), or remove it to avoid dead UI.
- [ ] Add loading/error/empty states for every network-dependent action (search, trailer fetch, account sync, invite accept) with consistent copy and retry CTA.
- [ ] Split `src/lib/app-state.tsx` into domain stores/hooks (`auth`, `discover`, `links`, `profile`, `settings`) to reduce complexity and rerenders.
- [ ] Replace the 7s polling loop in `src/lib/app-state.tsx` with event-driven sync (visibility/focus + realtime subscriptions + manual refresh).
- [ ] Add route-level guards for authenticated app pages (redirect unauthenticated users to login) to avoid blank/null states.

## UI Improvements

- [x] Define a small design token layer (spacing, radius, shadow, font scale, color aliases) and reuse it instead of repeating long utility chains.
- [ ] Standardize button hierarchy (primary/secondary/ghost/danger) and unify hover/active/disabled states.
- [ ] Improve dark-mode contrast in low-emphasis text (some `text-slate-400/500` shades are too dim on deep backgrounds).
- [ ] Add skeleton placeholders for cards and search rows to make loading feel intentional.
- [ ] Make icon sizing and stroke weights consistent across pages (discover, picks, profile, modals).

## UX Improvements

- [ ] Add first-run onboarding tooltips for Discover gestures, filter usage, and undo behavior.
- [ ] Preserve discover context better (selected filters/search + last browsed item) when user navigates away and returns.
- [ ] Improve share flow feedback in Picks (show explicit success/error toast, not only transient icon state).
- [ ] Add “why no results” guidance with fast actions (clear filter, expand query, browse trending).
- [ ] Add accessibility polish: visible focus states, escape-to-close modal behavior everywhere, better ARIA labels for icon-only buttons.

## Technical Improvements

- [ ] Move heavy derived computations from render path into memoized selectors or dedicated hooks.
- [ ] Add request deduping/caching for movie search and trailer fetch (debounce exists, but caching by query/id is missing).
- [ ] Consolidate repeated runtime/quality filter logic shared by client and API into one reusable utility module.
- [ ] Add schema validation (e.g. Zod) for API request/response payloads in `src/app/api/*` routes.
- [ ] Add centralized error logger and user-safe error mapper for consistent API/UI messaging.

## Performance

- [ ] Lazy-load large modals and trailer iframe components to reduce initial bundle cost.
- [ ] Memoize list items in Picks/Shared views when item count grows.
- [ ] Audit unnecessary re-renders caused by passing unstable inline callbacks/objects.
- [ ] Add image optimization strategy for posters (dimensions, placeholders, fallback, loading policy).
- [ ] Measure bundle/runtime with `next build` + analyzer before/after each major refactor.

## Security and Data

- [ ] Revisit local storage of auth/session data and ensure token handling follows Supabase recommended secure flow.
- [ ] Ensure all mutating API routes enforce auth + ownership checks consistently.
- [ ] Add server-side rate limiting to sensitive actions beyond email auth flow (invites, link accept, swipe burst abuse).
- [ ] Add audit-safe logs for critical user actions (link/unlink, invite creation, profile update).
- [ ] Verify storage bucket and RLS policies for profile photo upload paths.

## Testing and Quality

- [ ] Add unit tests for discover ranking/filtering utilities.
- [ ] Add integration tests for auth + account-sync flows.
- [ ] Add e2e tests for critical journeys: signup/login, swipe/undo, invite accept, shared watchlist toggles.
- [ ] Add visual regression checks for dark/light mode in key screens.
- [ ] Add CI quality gates (typecheck, lint, tests) and fail on regressions.

## Suggested Execution Plan (2-3 Weeks)

- [ ] Week 1: Fix Priority 0 + key UX bugs, then stabilize loading/error states.
- [ ] Week 2: Refactor app-state into modules + reduce polling + add route guards.
- [ ] Week 3: Add tests/CI, performance pass, and accessibility polish.


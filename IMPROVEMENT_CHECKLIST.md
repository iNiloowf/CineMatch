# CineMatch — Improvement Checklist

_Last reviewed: app shell, `(app)` layout, `ProtectedScreen`, settings, motion tokens, API surface (no Zod yet), scripts._

## Done

- [x] Discover: top-right menu wired (settings / profile / paste link / dark mode).
- [x] Design tokens (spacing, radius, shadow, font scale, colors) + button hierarchy (primary/secondary/ghost).
- [x] Icon sizing/stroke consistent (discover, picks, profile, modals).
- [x] Modal/sheet layout unified (header/body/footer, close, safe area).
- [x] Visual noise: fewer competing gradients/glows where readability suffered.
- [x] Narrow-width pass (~≤380px): chips/buttons avoid clipping on small Android.
- [x] **Less motion** in Settings (saved as `reduce_motion` / local defaults) + OS `prefers-reduced-motion` → `html[data-reduce-motion]` (see `supabase/migrations/20250416000000_settings_reduce_motion.sql` for DB).

## Priority — product & stability

- [x] Loading / error / empty for all network actions (search, trailer, sync, invite) + retry CTA.
- [x] Route guards on authenticated app routes: `(app)` layout wraps **`ProtectedScreen`** — redirect to `/` when logged out after `isReady`; **DiscoverCardSkeleton** + copy while bootstrapping/syncing; **NetworkStatusBlock** on sync failure. _Polish:_ `return null` when `!currentUserId` can mean one frame of empty chrome before the client redirect runs.
- [x] Split `app-state` into domain hooks; replace 7s polling with focus/visibility + events + manual refresh. _(Sync-focused hooks in `src/lib/hooks/`; core state still centralized in `app-state.tsx`.)_

## UI & UX (condensed)

- [x] Dark mode: better contrast on muted/meta text and tinted surfaces.
- [x] Skeletons for cards/search rows; clearer empty/error/success patterns.
- [x] One visual system: type scale, vertical rhythm, radius/elevation by role, chip/badge grammar, input states, z-index scale doc (`docs/visual-system.md`).
- [x] A11y: focus rings, 44px targets where needed, Escape closes modals, icon-only ARIA.
- [x] Motion: shared `--motion-*` durations/easings, opacity-first reduced paths, **`html[data-reduce-motion]`** (Settings **Less motion** + OS reduce motion).
- [x] Onboarding nudges (Discover gestures, filters, undo); preserve discover context on return; Picks share feedback (toast); “no results” hints + actions.

## Engineering

- [x] Perf: memoized list rows, lazy trailer modals, TMDB poster sizing helpers, stabler callbacks on Discover/Picks; **`npm run analyze`** (bundle analyzer) for large changes.
- [ ] API: Zod on `src/app/api/*`, dedupe/cache search + trailer, shared filter utils client+server, centralized errors/logging. _(No Zod in repo yet.)_
- [ ] Security: Supabase session storage review, auth+ownership on mutating routes, rate limits (invites/accept/swipe), audit logs for sensitive actions, RLS/storage for avatars.
- [ ] Tests & CI: unit (discover utils), integration (auth/sync), e2e (login, swipe/undo, invite, shared toggles), visual smoke dark/light, CI gates (typecheck, lint, test). _(Scripts today: `npm run build`, `npm run lint` — no `test` script / CI workflow in tree.)_

## Native / distribution

- [x] Capacitor Android scripts (`cap:sync`, `cap:open:android`, `cap:run:android`) in `package.json`.

# CineMatch — Improvement Checklist

_Last reviewed: Apr 2026 — **historical** route-by-route UI notes. **Current forward backlog:** [`NEXT_TASKS.md`](./NEXT_TASKS.md)._

**Baseline now shipped:** `error.tsx` / `global-error.tsx`, Zod on API routes, Vitest + CI, offline banner + sync retry, skip link, admin APIs via `requireServerAdmin`, `x-request-id`, Privacy/Terms, Picks virtualization, discover-quality/queue modules, shared `AppRoute*` loading/empty UI.

## How to improve next (short guide)

1. **Architecture:** extract remaining **account sync** from `app-state.tsx` (see `NEXT_TASKS.md`).
2. **Scale:** virtualize **Discover search** rows; optional Shared; posters / CLS.
3. **Ship:** Android smoke, store listing, optional Sentry, broader tests.

_Developer tooling — Cursor plan usage:_ see **[cursor.com](https://cursor.com)** → account / **Dashboard** → **Usage**.

---

## Done

- [x] Discover: top-right menu wired (settings / profile / paste link / dark mode).
- [x] Design tokens (spacing, radius, shadow, font scale, colors) + button hierarchy (primary/secondary/ghost).
- [x] Icon sizing/stroke consistent (discover, picks, profile, modals).
- [x] Modal/sheet layout unified (header/body/footer, close, safe area).
- [x] Visual noise: fewer competing gradients/glows where readability suffered.
- [x] Narrow-width pass (~≤380px): chips/buttons avoid clipping on small Android.
- [x] **Less motion** in Settings (saved as `reduce_motion` / local defaults) + OS `prefers-reduced-motion` → `html[data-reduce-motion]` (see `supabase/migrations/20250416000000_settings_reduce_motion.sql` for DB).
- [x] **`/signup`:** aligned with **`/`** (theme, blobs, stagger, field errors, `role="alert"` banners, password rules before submit, success + delayed redirect for demo `shouldRedirect`, `PasswordInput` `id` for labels).
- [x] **`/connect`:** friendlier copy, 3-step “how it works”, staggered motion, `ui-btn`-style CTAs, copy-again for invite URL.
- [x] **`/picks`:** stat micro-labels (Saved / Also shared), poster-top rows, modal scroll + sticky actions, trailer slow-network / iframe loading states.
- [x] **`/shared`:** accordion header/body contrast, dark-friendly toggle pills, inline **More/Less** + details modal, mutual chips aligned with Picks-style violet grammar, picks-like movie cards.
- [x] **`/settings`:** account strip (avatar, name, email, city) + section eyebrows + calmer achievement rows (partial — full “group toggles by theme” still optional).
- [x] **Media type label:** “Film” → **“Movie”** on Picks + Shared poster strips.

## Priority — product & stability

- [x] Loading / error / empty for all network actions (search, trailer, sync, invite) + retry CTA.
- [x] Route guards on authenticated app routes: `(app)` layout wraps **`ProtectedScreen`** — redirect to `/` when logged out after `isReady`; **AppRouteLoading** while bootstrapping/syncing; **NetworkStatusBlock** on sync failure; spinner + “Redirecting to sign in…” when logging out.
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
- [x] API: Zod on mutating/query routes via shared helpers; shared discover filter in `discover-quality.ts` (client + `GET /api/movies`); centralized JSON errors (`api-response`).
- [x] Security baseline: Supabase session storage + server JWT verification (`docs/security-supabase-session.md`), bearer + ownership on mock mutating routes + Supabase-backed APIs, rate limits (invite create/accept, swipe POST/DELETE, account-sync GET), `security_audit_log` for invite/swipe actions, schema RLS + `profile-photos` storage (see schema / same doc).
- [x] Admin dashboard: server routes use `requireServerAdmin` (env allowlist + optional `app_metadata.role`); no password gate in client bundle.
- [x] Tests & CI: `npm test` (Vitest), `.github/workflows/ci.yml` (lint + tsc + test). _Follow-up:_ more unit/integration coverage (`NEXT_TASKS.md`).

## Native / distribution

- [x] Capacitor Android scripts (`cap:sync`, `cap:open:android`, `cap:run:android`) in `package.json`.

---

## Optional polish (not tracked in detail here)

_Use [`NEXT_TASKS.md`](./NEXT_TASKS.md) for the main backlog. Ideas below are **nice-to-have**._

- [ ] **Landing copy:** optional extra “why sign in” line on `/`.
- [ ] **Settings:** tighter grouping of toggles by theme (partially done).
- [ ] **i18n:** only if you leave English-only; product is English today.
- [ ] **Cookie consent / analytics:** if you add non-essential cookies or third-party analytics.
- [ ] **PWA install / offline shell:** if web install matters more than the Capacitor app.

## Per-screen UI (archive)

_Historical route passes; most items are shipped. Discover, Connect/linked, Picks, Shared, Profile, Settings, landing, and signup were brought to the current visual system._

- [x] **`/`**, **`/signup`**, **`/auth/callback`**, **`/discover`**, **`/linked`**, **`/connect`**, **`/picks`**, **`/shared`**, **`/profile`**, **`/settings`**, **`/friends/[userId]`** — contrast, loading/error, dark parity, motion, and touch targets (see sections above for detail).
- [x] **Settings achievements** (and similar chips on **Picks**/stats): chip/badge colors tuned for dark theme where needed.

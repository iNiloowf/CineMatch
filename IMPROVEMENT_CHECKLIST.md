# CineMatch — Improvement Checklist

_Last reviewed: Apr 2026 — signup/connect/picks/shared/settings UI passes; still no `error.tsx`, no API Zod._

## How to improve the app (quick guide)

1. **Stability first:** finish route-guard polish, add `error.tsx`, validate API inputs (Zod), then tighten Supabase RLS and auth checks — fewer surprise failures in production.
2. **Feel second:** dark-mode parity on every route, offline banner, less empty `return null` while data resolves — users should always see *something* intentional.
3. **Speed to ship:** split the giant `app-state.tsx`, add a minimal test + CI gate so refactors don’t regress login/swipe/invite flows.

---

## Next steps to ship (bring it to life)

_Order: stability → reliability → tests → real backend → polish._

1. **Production hardening** — Add **`error.tsx`** / **`global-error.tsx`** so runtime errors never white-screen. Add **Zod (or similar)** on `src/app/api/*` with consistent error bodies. On Supabase: **RLS**, **auth + ownership** on mutating routes, **rate limits** (invites / accept / swipe), **safe avatar storage**.
2. **Reliability & trust** — **`ProtectedScreen`**: replace bare **`return null`** with a short “Redirecting…” / spinner so the shell never flashes empty. **Offline**: listen to **`online` / `offline`**, show a dismissible banner; optionally retry sync / failed actions when back online.
3. **Tests + CI** — Introduce **`npm test`** (start with integration: login, invite, swipe) and a **GitHub Action** running **lint + typecheck + test** so refactors stay safe.
4. **Product “life”** — Wire critical reads/writes to **Supabase** (trim mock-only paths when you no longer need them). Add **client error reporting** (e.g. Sentry) + **correlation ids** on API errors when you have real users. Add **privacy / terms** if you store PII or use analytics.
5. **Polish backlog** — **`/auth/callback`**: branded loading + explicit error + retry / back to login. **Skip link** to main content in **`AppShell`**. **Picks** nested modals: focus trap + **Escape** order audit. **Long lists**: virtualize Picks / Shared / Discover search if libraries routinely exceed ~50 rows.

_Developer tooling — Cursor plan usage:_ see **[cursor.com](https://cursor.com)** → account / **Dashboard** → **Usage** (and in-app **Settings**, search **usage**, if your build shows a usage bar).

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
- [x] Security: Supabase session storage + server JWT verification (`docs/security-supabase-session.md`), bearer + ownership on mock mutating routes + Supabase-backed APIs, rate limits (invite create/accept, swipe POST/DELETE, account-sync GET), `security_audit_log` for invite/swipe actions, schema RLS + `profile-photos` storage (see schema / same doc).
- [ ] Tests & CI: unit (discover utils), integration (auth/sync), e2e (login, swipe/undo, invite, shared toggles), visual smoke dark/light, CI gates (typecheck, lint, test). _(Scripts today: `npm run build`, `npm run lint` — no `test` script / CI workflow in tree.)_

## Native / distribution

- [x] Capacitor Android scripts (`cap:sync`, `cap:open:android`, `cap:run:android`) in `package.json`.

---

## Backlog — from latest app review (add/improve in the app)

_Use these as the next tickets; none replace the Engineering section above — they extend it with UI/product polish._

### Stability & shell

- [ ] **`ProtectedScreen`:** when `!currentUserId` after `isReady`, show a tiny “Signing you out…” / spinner instead of **`return null`** so the shell never flashes empty before `router.replace("/")`.
- [ ] **Next.js errors:** add **`error.tsx`** (and optionally **`global-error.tsx`**) under `app/` and/or `(app)/` with reset + “Reload” so runtime errors don’t white-screen.
- [ ] **Offline:** listen to `online` / `offline`, show a dismissible banner; optionally queue or retry failed swipes / sync when back online.

### UX & visual consistency

- [ ] **Dark mode sweep:** **Profile** (residual), **`/auth/callback`**, and any remaining **`return null`** while `currentUser` resolves — align muted text, chips, and surfaces with Discover/linked quality. _( **`/signup`** aligned with landing.)_
- [x] **Settings achievements** (and similar chips on **Picks**/stats): ensure chip/badge colors read well in **dark** theme (avoid light-only `bg-emerald-100` / `bg-violet-100` where it clashes).
- [ ] **Skip link:** “Skip to main content” for keyboard users, targeting the scroll container in **`AppShell`**.
- [ ] **i18n (optional):** if you ship beyond English, extract strings + RTL; today the UI is English-only.

### Per-screen UI — what to improve next

_Use this as a route-by-route “UI pass” checklist (contrast, hierarchy, empty/loading/error, touch targets, dark parity)._

- [x] **`/` (login / landing):** dark parity on hero, form, demo card, and errors; primary gradient CTA vs outlined secondary **Create an account**; client-side field errors + `role="alert"` server banner; ambient blob motion + staggered panel enter + CTA shine loop (**`data-reduce-motion`** / OS reduce disables heavy motion). _Still optional:_ extra “why sign in” marketing line.
- [x] **`/signup`:** same as login for theme + errors; show password rules before submit; success state before redirect; align spacing with `/` so the flow feels one system.
- [ ] **`/auth/callback`:** never a blank screen — branded spinner + short copy (“Finishing sign-in…”); explicit error panel with **Retry** / **Back to login**; respect safe area on mobile.
- [x] **`/discover`:** hero readability (stronger scrim, title weight, genre + year + runtime chips); toolbar microcopy + **`aria-describedby`** + visible **Filter** label; stat strip + search rows use shared chip grammar; undo toast uses **safe-area + nav-aware** bottom offset; skeleton mirrors card layout + **dissolve-in**; hero + toolbar enter motion (**reduce-motion** safe).
- [x] **`/linked` + `/connect`:** Friends hub on **`/linked`** (accent row, **Active** vs **Pending** badges w/ dark tints, shared-pick summary); empty state → **Go to Connect**; invites + paste + create link on **`/connect`** w/ animated shell; **max 3** friends; new invites use **`/connect?invite=`** (old **`/linked?invite=`** redirects).
- [x] **`/picks`:** stat cards: add micro-labels (“Saved” / “Also shared”) if numbers alone confuse; row density vs tap targets; modals: scroll affordance + sticky primary actions; trailer loading state on slow networks.
- [x] **`/shared`:** accordion header vs body contrast; toggle pills readable in dark (unchecked state); long descriptions: “More” / expand without losing context; mutual-match badges consistent with Discover/Picks chip style.
- [x] **`/profile`:** save states (**Saving…** / top **Saved** or **error** toast + dismiss); **square crop preview** for chosen photo + hint; **Remove profile photo** in a rose **destructive** panel; **Cancel** on edit; **`isReady`** loading shell; dark parity on stats, snapshot, inputs, quick links, edit toggle; light motion (`discover-toolbar-enter`, `expand-soft`, hero ring).
- [x] **`/settings`:** group toggles by theme (Appearance / Notifications / Privacy); achievements: optional detail tap (why unlocked / locked / progress); About + Log out in a separated **Account actions** panel. Friend profile **`/friends/[userId]`** (avatar on **`/linked`** + Shared) shows their achievements and saved picks with **Add to mine**.

### Architecture & data

- [ ] **Decompose `app-state.tsx`:** extract auth/session, discover queue rotation, and account sync into dedicated modules or contexts to shrink the provider and simplify testing.
- [ ] **Client forms:** Zod (or similar) on **login / signup** before submit — pairs with the API Zod engineering item.
- [ ] **Long lists:** virtualize **Picks** / **Shared** / **Discover search** rows if lists regularly exceed ~50 items (e.g. `@tanstack/react-virtual`).

### QA & product

- [ ] **Deep links & cold start:** exercise `discover?movieId=…`, invite accept, OAuth **callback** on slow 3G / airplane toggle.
- [ ] **Nested modals:** **Picks** (details + trailer) — focus trap / Escape order audit so focus never escapes the topmost layer.
- [ ] **Observability (optional):** client error reporting (e.g. Sentry) + correlation ids on API errors for production debugging.

### Compliance & growth (optional)

- [ ] **Legal:** privacy / terms links if you store PII or use analytics; cookie consent if you add non-essential cookies.
- [ ] **PWA (optional):** installability, offline shell, cache strategy for static assets — only if web install matters for your users.

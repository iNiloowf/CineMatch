<!-- Agents: keep this file in English. Do not commit/push this file unless the user explicitly asks. -->

# CineMatch — Task list (organized)

**Stack:** Next.js 16, React 19, Supabase, Capacitor Android, Vitest + GitHub Actions CI. Request boundary: **`src/proxy.ts`**.

**Where to look:** shipped work = `main` · **Manual QA:** `docs/MANUAL_QA.md` · **Older UI history:** `IMPROVEMENT_CHECKLIST.md`

---

## A. Priority items 1–5 (done)

Each item: **what** → note (why it matters / where in repo).

- [x] **Shrink `app-state.tsx` (sync path)**  
  - Sync logic split into `src/lib/account-sync/` (`types`, `chunk-items`, `settings-fetch`, `fetch-from-browser`, `snapshot-storage`). Easier to test and maintain; more hook splits optional later.
- [x] **Stronger automated tests**  
  - Vitest: `discover-quality.test.ts`, `discover-queue.test.ts`. MSW/Playwright-style integration tests still optional.
- [x] **Android + Play release discipline**  
  - Runbook: `docs/RELEASE_CHECKLIST.md`. Versions live in `android/app/build.gradle` (bump each store upload).
- [x] **Bundle budget**  
  - How-to: `docs/BUNDLE_BUDGET.md`. Command: `npm run analyze` after big UI/deps changes.
- [x] **Production monitoring**  
  - `@sentry/nextjs` when `NEXT_PUBLIC_SENTRY_DSN` is set (`sentry.*.config.ts`, `instrumentation.ts`, `withSentryConfig` in `next.config.ts`). Pair with `x-request-id` in logs if you debug API issues.

---

## B. Other shipped work (reference)

- **Discover deck + API quality** — `discover-quality.ts` + `discover-queue.ts`; `GET /api/movies` shares `passesDiscoverQualityThreshold`.
- **Route loading / empty / error** — `AppRouteLoading`, `AppRouteEmptyCard`, `AppRouteNetworkStatus` on core routes.
- **`middleware` → `proxy`** — `src/proxy.ts` — admin rewrite, `x-request-id`, cookie cleanup.
- **Play / Capacitor baseline** — Splash, strings, `GOOGLE_PLAY_PUBLISHING.md` (see doc for store form).
- **Virtualized lists** — Discover search & Shared partner lists when count ≥ 24 (`VirtualScrollList`).
- **Images & CLS** — TMDB `remotePatterns`; `PosterBackdrop` + `next/image` where applicable.
- **Discover sheets** — Tap-outside to close, dialog roles/labels for search & genre filter.

---

## C. Optional next ideas (not committed as “must do”)

- [ ] **Landing “why sign in” line** — Extra marketing on `/` if you want stronger conversion.
- [ ] **Settings toggle grouping** — Group toggles by theme (partially done).
- [ ] **i18n / RTL** — Only if you leave English-only; product is English today.
- [ ] **Cookie consent + analytics** — If you add non-essential cookies or third-party trackers.
- [ ] **PWA install / offline shell** — If web install matters beyond the Capacitor app.
- [ ] **More E2E / MSW tests** — Login → swipe → invite flows; complements current Vitest unit tests.

---

## D. Product backlog (user-requested — Apr 2026)

Captured from planning notes. **Not all implemented**; treat as a prioritized queue.

### Auth & onboarding

- [x] **Stronger signup password** — **Done in code:** min 8 chars + at least one special character (`signupPasswordFieldSchema`); `/api` signup + send-signup-email aligned.
- [x] **Email confirmation UX** — Dedicated `/auth/check-email` after signup (Supabase); `/auth/email-confirmed` after link; pending payload in session for resend (same tab).
- [ ] **Onboarding: “tune your voice”** — Max **5** favorite genres; dislikes step (exclude picks from favorites); tidy genre UI; ask **movie vs series vs both**.
- [ ] **Autoplay preference** — First-run prompt (on/off); persist; verify Settings autoplay matches backend.

### Discover & Picks

- [ ] **Tab / film desync** — Fix state when switching tabs so the wrong film doesn’t show.
- [ ] **Bottom nav + animation** — Fix gap / layout between deck animation and bottom navbar.
- [ ] **Undo affordance** — Smaller undo on card; less “tip” chrome.
- [ ] **Picks loading order** — Queue ↔ Watched: load rows **top-to-bottom** consistently.
- [ ] **Picks insights** — Rework insight/suggest/match using **linked genres + dislikes**.

### Shared & Connect

- [ ] **Empty Shared** — **Connect** CTA when empty.
- [ ] **Invite copy** — Preface: “**Name** sent you a CineMatch connect link” before save/share.
- [ ] **Shared detail density** — Less metadata by default; full detail on demand.
- [ ] **Friend profile** — Move **achievements** lower.
- [ ] **Copy link + paste** — **Copy my link**; **Paste link** → modal; dark-mode styling on trigger.

### Settings & profile

- [ ] **Less motion** — Broken for some — audit `reduce_motion`, `data-reduce-motion`, CSS.
- [ ] **Settings toggles** — Fix alignment / hit targets.
- [ ] **Settings titles** — More space above cards (titles too tight).
- [ ] **Notifications** — Button does nothing — implement or hide.
- [ ] **Legal** — Move **Privacy / Terms** to **bottom** of Settings.
- [ ] **Profile layout** — Bigger profile block; above settings; **Edit** as **icon** top-left (remove big button).
- [ ] **Theme previews** — Dark mode: themes look too similar — stronger previews.
- [ ] **Theme apply** — No app restart needed after theme change.
- [ ] **Connect on profile** — Add **Connect** entry on profile card.

### Discover menu & polish

- [ ] **Discover `…` menu** — Add **Sign out**.
- [ ] **Popups** — Improve modal/sheet animations.

### Tickets & admin

- [ ] **User tickets** — User-facing tickets + **admin replies** in one place.

### Media & visuals

- [ ] **Photo removal** — Clear copy on what metadata/avatar removal does.
- [ ] **Blur in dark mode** — Fix backdrop blur / glass.

---

_Maintainer: English only. Git: only commit/push this file if you ask._

_Last updated: Apr 2026 — task bullet layout; section D backlog; signup password rules tightened._

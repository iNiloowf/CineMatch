<!-- Agents: keep this file in English. Do not commit/push this file unless the user explicitly asks. -->

# CineMatch — Next tasks

**Stack:** Next.js 16, React 19, Supabase, Capacitor Android, Vitest, GitHub Actions. Request boundary: **`src/proxy.ts`**.

**Docs:** `docs/MANUAL_QA.md` (release QA) · `docs/RELEASE_CHECKLIST.md` · `docs/BUNDLE_BUDGET.md` · `docs/GOOGLE_PLAY_PUBLISHING.md` · older notes: `IMPROVEMENT_CHECKLIST.md`

---

## Audit snapshot (Apr 2026)

Code review of `main`: auth (login, signup, `/auth/check-email`, `/auth/callback`, `/auth/email-confirmed`), Discover (deck, invite paste modal, virtual list, **Sign out** in `…` menu), Picks/Shared virtual lists, **Shared** empty state **Connect** CTA, **Profile** Connect + **Copy my link**, **Settings** tickets link + `/settings/tickets` (thread + admin reply UI), **Sentry** wiring when DSN set, **`src/lib/account-sync/`** split from sync path.

---

## Verified shipped (reference)

- [x] Account sync split out of monolith (`src/lib/account-sync/`)
- [x] Core Vitest coverage (`discover-quality`, `discover-queue`, `match-score`)
- [x] Stricter signup password + Resend + Supabase admin link (`send-signup-email`)
- [x] Dedicated **check email** step (`/auth/check-email`) + polished **email confirmed**
- [x] Bottom nav pill drag + tab highlight sync + touch hover fixes
- [x] Virtualized long lists (Discover search, Picks queues, Shared)
- [x] Support tickets API + user **My tickets** thread (incl. admin reply / conversation migration)

---

## Recommended next (highest leverage)

- [ ] **`app-state.tsx` size** — Still **~2.7k** lines; continue peeling **non-sync** concerns (e.g. discover session, toasts, billing touchpoints) into hooks/libs with narrow imports.
- [ ] **Automated integration tests** — Unit tests exist under `src/lib/*.test.ts`; add **API route** tests (Vitest + `Request` mocks) or **Playwright** for auth → discover → picks happy path.
- [ ] **Manual QA doc** — Extend `docs/MANUAL_QA.md` with **Supabase email** path: signup → `/auth/check-email` → inbox link → `/auth/email-confirmed` → app.
- [ ] **Notifications setting** — Toggle persists (`updateSettings`) but there is **no push/email pipeline**; add helper copy (“Coming soon”) or scope **web push / email digests** and wire one path.

---

## Product & UX backlog

- [ ] **Onboarding** — “Tune your voice”: cap favorite genres, dislikes step, movie vs series vs both; tidy genre UI.
- [ ] **Autoplay** — First-run or settings-driven prompt; confirm trailer autoplay respects setting end-to-end.
- [ ] **Discover** — Tab / route switches vs **wrong card** (state reset); deck vs **bottom nav** spacing if still tight on small phones.
- [ ] **Discover undo** — Smaller undo control; less instructional chrome on the card.
- [ ] **Picks** — Consistent **top-to-bottom** load order between Queue / Watched; **insights** using linked genres + dislikes.
- [ ] **Invite share copy** — Optional lead-in: “**Name** sent you a CineMatch connect link” in system share sheet / message template where OS allows.
- [ ] **Shared / friend detail** — Lighter default metadata; achievements lower on friend profile; **shared** row density polish.
- [ ] **Settings layout** — More air above section titles; **Privacy / Terms** block at bottom; toggle **alignment / hit targets** pass on small widths.
- [ ] **Theme** — Stronger **preview** contrast in dark; **apply theme** without full reload if anything still flashes.
- [ ] **Less motion** — Regression pass: `reduce_motion`, `html[data-reduce-motion]`, tab-route + discover animations.
- [ ] **Modals** — Sheet/dialog motion consistency (Discover filters, details, trailer stack).
- [ ] **Avatar removal** — Clearer copy on what gets cleared (storage vs profile row).
- [ ] **Glass / blur** — Dark-mode backdrop blur performance + legibility on low-end Android.

---

## Platform & growth (optional)

- [ ] **Cookie consent + analytics** — If you add non-essential cookies or extra trackers beyond Sentry/Supabase.
- [ ] **PWA / install** — Only if web install matters beyond Capacitor.
- [ ] **i18n / RTL** — Product is English-first today.
- [ ] **Landing copy** — Stronger “why sign in” on `/` if conversion data says so.

---

## Tech hygiene (optional)

- [ ] **ESLint** — Reduce `react-hooks/*` noise (refs-in-render patterns) via small refactors or scoped disables with comments.
- [ ] **Resend signup draft** — `sessionStorage` on `/auth/check-email` is convenient but sensitive; document threat model or add **email-only resend** API later.

---

_Maintainer: English only. Git: only commit/push this file if you ask._

_Last updated: Apr 2026 — full rewrite from repo audit._

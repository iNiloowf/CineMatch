# Your next tasks — CineMatch

## Summary

**Apr 2026 — current `main`:** **API validation (Zod)**, **auth copy**, **route + root error boundaries** (`error.tsx` / `global-error.tsx`), and **ProtectedScreen** redirect UI (spinner + “Redirecting to sign in…”, no empty flash) are shipped.

**Next focus (full-app review):** **admin** hardening, **offline** UX, **tests + CI**, then **a11y & polish** (skip link, `/auth/callback` mobile/error paths, nested modal focus), then **engineering** (split `app-state`, client-side form validation, long-list virtualization, deep-link QA), plus optional **observability**.

Older per-route backlog stays in **`IMPROVEMENT_CHECKLIST.md`** — ignore stale lines that still claim “no `error.tsx`” / “no API Zod” (those are fixed on `main`).

---

## Done (don’t re-ticket)

- [x] **API:** Zod + shared error shape on `src/app/api/**/route.ts` (`apiJsonError`, `VALIDATION_ERROR`, …).
- [x] **Auth copy:** No misleading “demo login” CTA; Supabase vs browser-local explained on landing.
- [x] **Errors:** `error.tsx` + `global-error.tsx` + `error-fallback-content` (reset + short copy; no white-screen).
- [x] **ProtectedScreen:** When `isReady && !currentUserId` — “Redirecting to sign in…” + theme-matching spinner (replaces bare `return null`).

---

## Next tasks (priority)

1. [ ] **Admin `/admin`** — Remove client email/password gate; **session/bearer only** + env allowlists (`ADMIN_*`), no secrets in the client bundle.
2. [ ] **Offline UX** — `online` / `offline` listener, small dismissible banner; optionally retry `account-sync` or failed actions when back online.
3. [ ] **Tests + CI** — Add `npm test` (start with auth or API smoke) + GitHub Action: `lint` + `tsc --noEmit` + `test` (no workflow in repo yet).
4. [ ] **Icons / PWA** — Stable icon via `NEXT_PUBLIC_APP_ICON_URL` or `public/icons/` + `manifest` for install/splash.
5. [ ] **Repo hygiene** — Keep `git status` clean on `main` (no stray uncommitted edits).
6. [ ] **Skip link** — “Skip to main content” in **`AppShell`** targeting the main scroll region (keyboard users).
7. [ ] **`/auth/callback`** — Final pass: mobile **safe area**, clear error panel + **Retry** / back to login (loading exists; align edge cases with app theme).
8. [ ] **Nested modals (Picks + trailer)** — Focus trap + **Escape** stacking so focus never escapes the top layer.
9. [ ] **Split `app-state.tsx`** — Extract auth, account sync, discover queue into smaller modules/hooks for tests and maintenance.
10. [ ] **Client forms** — Zod (or similar) on login/signup before submit, consistent with API validation.
11. [ ] **Long lists** — Virtualize Picks / Shared / Discover search when libraries routinely exceed ~50 rows.
12. [ ] **Deep QA** — Exercise `discover?movieId=…`, invite cold start, OAuth on slow/offline networks.
13. [ ] **Observability (optional)** — Client error reporting (e.g. Sentry) + correlation ids on API errors for production debugging.

**Note:** **`/privacy`** and **`/terms`** pages exist and are linked from Settings; optional: add footer links on landing/signup for discoverability.

---

_Last updated: Apr 2026 — complements `IMPROVEMENT_CHECKLIST.md`._

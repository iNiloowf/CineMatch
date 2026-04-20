<!-- Agents: keep this file in English. Do not commit or push this file unless the user explicitly asks. -->

# Your next tasks — CineMatch

## Summary

**Apr 2026 — `main` is up to date with:** error boundaries, ProtectedScreen, admin + `processLock`, offline banner + sync retry on reconnect, Vitest + GitHub Actions CI, skip link → `#main-content`, Zod login/signup, `/auth/callback` safe-area + Try again, trailer **Escape** to close, landing Privacy/Terms, ESLint ignoring `android/**`.

**Still open:** split `app-state`, list virtualization, full modal focus/stacking audit (beyond trailer Escape), observability, manual deep QA.

---

## Done (tick = shipped — don’t re-ticket)

- [x] **API:** Zod + shared error shape on `src/app/api/**/route.ts`.
- [x] **Auth copy / landing:** No misleading demo CTA; Supabase vs local; **Privacy · Terms** on `/`.
- [x] **Errors:** `error.tsx` + `global-error.tsx` + shared fallback.
- [x] **ProtectedScreen:** Redirect spinner + copy when logged out.
- [x] **Admin:** Session + Bearer; `ADMIN_*`; `INITIAL_SESSION`; English gates; `processLock`.
- [x] **Offline UX:** `OfflineBanner` + dismiss; retry **account-sync** when back online.
- [x] **Tests + CI:** `npm test` (Vitest) + smoke test; `.github/workflows/ci.yml` (`lint`, `tsc`, `test`).
- [x] **Icons / PWA:** `manifest.ts` + `public/icons/` + optional `NEXT_PUBLIC_APP_ICON_URL`.
- [x] **Skip link:** “Skip to main content” in `AppShell` → `#main-content`.
- [x] **`/auth/callback`:** Safe-area; **Try again** for client-side exchange errors.
- [x] **Trailer modal:** **Escape** closes (`PicksTrailerModal`).
- [x] **Client forms (Zod):** `loginFormSchema` / `signupFormSchema` on `/` and `/signup`.
- [x] **ESLint / CI hygiene:** Ignore `android/**`; `react-hooks/refs` + `set-state-in-effect` as **warnings** so CI stays green.

---

## Next tasks (not done yet — `[ ]`)

1. [ ] **Split `app-state.tsx`** — Extract auth, sync, discover into smaller modules/hooks.
2. [ ] **Long lists** — Virtualize Picks / Shared / Discover search at scale.
3. [ ] **Nested modals (full pass)** — Focus-trap + stacking for details + trailer + sheets (trailer **Escape** is done; audit the rest).
4. [ ] **Deep QA** — `discover?movieId=…`, invites, OAuth on slow/offline (manual).
5. [ ] **Observability (optional)** — Sentry + API correlation ids.
6. [ ] **Repo hygiene** — Clean working tree; don’t commit `android/**` build outputs.

---

_Maintainer: English only. Git: only commit/push this file if you ask._

_Last updated: Apr 2026 — complements `IMPROVEMENT_CHECKLIST.md`._

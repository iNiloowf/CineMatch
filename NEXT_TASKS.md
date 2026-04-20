# Your next tasks — CineMatch

## Summary

Quick review (**Apr 2026**): **API validation** is in place (`src/server/api-response.ts`, `src/server/api-validation.ts` — Zod on JSON bodies, `parseSearchParams` for GET queries, consistent `{ error, code, details? }`). **Auth UI** no longer sells a separate “demo login”; offline vs Supabase is explained on the landing card.

**Focus next:** runtime resilience (`error.tsx`), **admin** client auth cleanup, **ProtectedScreen** empty flash, **offline** banner, then **tests + CI**. Full history and per-route backlog stay in **`IMPROVEMENT_CHECKLIST.md`** (that file’s old “no API Zod” line is stale — validation shipped on `main`).

---

## Already shipped (don’t re-ticket)

- [x] **API:** Zod + shared error shape on `src/app/api/**/route.ts` (`apiJsonError`, `INVALID_JSON` / `VALIDATION_ERROR`, etc.).
- [x] **Auth copy:** No “demo login” CTA; signup/landing text describes Supabase vs browser-local accounts.

---

## Next tasks (priority order)

1. **`error.tsx` / `global-error.tsx`** — Route or root error boundaries with reset + short copy so uncaught errors never white-screen the app shell.
2. **Admin `/admin` security** — Today the page still has a **client-side** email/password gate alongside server `requireServerAdmin`. Move to **session/bearer only** + env allowlists (`ADMIN_*`), no duplicate secrets in the client bundle.
3. **`ProtectedScreen`** — When `isReady && !currentUserId`, it still **`return null`** before `router.replace("/")` → brief empty flash. Show “Redirecting to sign in…” + spinner (see `src/components/protected-screen.tsx` ~L87–89).
4. **Offline UX** — Listen to `online` / `offline`, show a small dismissible banner; optionally retry `account-sync` or failed actions when back online.
5. **Tests + CI** — Add `npm test` (start with auth or API smoke) + GitHub Action: `lint` + `tsc --noEmit` + `test`.
6. **Icons / PWA** — Stable app icon: `NEXT_PUBLIC_APP_ICON_URL` or update `public/icons/` for install/splash.
7. **Repo hygiene** — Run `git status`; commit or discard stray edits so `main` stays clean.

---

_Last updated: Apr 2026 — complements `IMPROVEMENT_CHECKLIST.md`._

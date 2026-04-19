# Your next tasks — CineMatch

## Summary

Ship **security and stability** first (admin auth, error boundaries, API validation), then **UX reliability** (no empty shell flash, offline awareness), then **tests + CI**. See **`IMPROVEMENT_CHECKLIST.md`** for the full backlog and what is already done.

## Checklist

1. **Admin:** Remove hardcoded admin credentials from `/admin` and admin API routes; use env + server-side role checks only.
2. **Errors:** Add `error.tsx` (and optionally `global-error.tsx`) so runtime failures don’t white-screen.
3. **API:** Add **Zod** (or similar) on `src/app/api/*` routes with consistent error responses.
4. **`ProtectedScreen`:** Replace bare `return null` with a short “Signing you out…” / spinner before redirect.
5. **Offline:** Listen to `online` / `offline`; show a small banner; optionally retry sync when back online.
6. **Tests + CI:** Add `npm test` and a GitHub Action for `lint` + `typecheck` + `test`.
7. **Web / PWA icon:** For CDN-driven updates, set **`NEXT_PUBLIC_APP_ICON_URL`** to a stable HTTPS square PNG (≥512px). Otherwise replace files under **`public/icons/`** and redeploy.
8. **Repo hygiene:** Run **`git status`**; commit or discard any stray edits (e.g. `profile/page.tsx`).

---

_Last updated: Apr 2026 — complements `IMPROVEMENT_CHECKLIST.md`; not a replacement._

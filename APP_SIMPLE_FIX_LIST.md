# CineMatch Simple Fix List

## Fix now

- [ ] Remove hardcoded admin email/password from client and API.
- [ ] Add real server-side admin role check.
- [ ] Add `error.tsx` and `global-error.tsx`.
- [ ] Add API request validation (Zod or similar).
- [ ] Add basic tests + CI (`lint`, `typecheck`, `test`).
- [ ] Add Privacy Policy page.
- [ ] Add Terms of Service page.

## Improve next

- [ ] Split `src/lib/app-state.tsx` into smaller modules.
- [ ] Add offline banner + retry for failed requests.
- [ ] Add better `/auth/callback` loading + error UI.
- [ ] Add long-list virtualization for Picks/Shared/Search.
- [ ] Add monitoring (Sentry or similar).

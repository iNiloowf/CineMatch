# CineMatch — pre-release checklist

Run locally before tagging a release:

```bash
npm run release:check
```

This runs `lint` → `test` → `build`. Fix any failures before deploy.

## Build & quality

- [ ] `npm run release:check` passes (no ESLint issues, tests green, production build OK).
- [ ] Preview the production build: `npm run build && npm run start` and smoke-test core flows (see below).
- [ ] **Sentry** (optional): set `NEXT_PUBLIC_SENTRY_DSN` in the hosting environment for client/server error capture.

## Environment (hosting + secrets)

- [ ] `NEXT_PUBLIC_APP_URL` = your **https** public URL (email links, redirects).
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` match production Supabase.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is **server-only** (never exposed as `NEXT_PUBLIC_*`).
- [ ] `RESEND_API_KEY` / `RESEND_FROM_EMAIL` for production; **`RESEND_TEST_MODE=false`** (or unset) for real delivery.
- [ ] TMDB token or key set if movie catalog / search should work.
- [ ] **Stripe** webhook secret and price IDs match the Stripe dashboard (live mode when going live).
- [ ] **Do not** set `NEXT_PUBLIC_OFFLINE_DEMO_PASSWORD` in production (offline demo is for no-Supabase local use only).

## Data & app behavior

- [ ] Supabase migrations applied in the project SQL / dashboard for production.
- [ ] Smoke-test: sign-in, Discover swipe, Picks, Shared, Friends, profile save, settings.
- [ ] **Android (Capacitor)**: `npx cap sync android` after web deploy; verify `capacitor.config.ts` `server.url` is production.

## Security & compliance

- [ ] No secrets in git; use host env / secrets store.
- [ ] Admin allowlists (`ADMIN_*` env) set if using `/admin`.
- [ ] `android/app/src/main/AndroidManifest.xml` — `INTERNET` only; add new permissions only with Play policy justification.

## Post-release

- [ ] Monitor Sentry (if enabled) and host logs for the first 24h.
- [ ] Verify Stripe test vs live webhooks in dashboard after first real payment (if applicable).

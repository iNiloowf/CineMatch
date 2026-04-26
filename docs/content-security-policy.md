# Content Security Policy (CSP)

The app sends a strict `Content-Security-Policy` on all routes via `next.config.ts` using `getContentSecurityPolicy()` from `src/lib/csp.ts`.

## What is allowed

- **Scripts:** Same-origin only in production (no `unsafe-inline` or `unsafe-eval` for scripts). The root layout uses `public/scripts/theme-boot.js` for early theme/Supabase cookie work so nothing inline is required. Development adds `'unsafe-eval'` for Next.js / Turbopack HMR.
- **Styles:** `'self' 'unsafe-inline'` (React `style` props and paint).
- **Images:** Same origin, `data:`, `blob:`, `image.tmdb.org`, and your `NEXT_PUBLIC_SUPABASE_URL` origin (posters, storage, etc.). TMDB **API** calls are server-only (`/api/movies`); the browser only talks to your app, Supabase, and (if configured) Sentry.
- **Connect:** Same origin (`'self'`), `NEXT_PUBLIC_APP_URL` and `VERCEL_URL` (if set on Vercel), Supabase HTTPS + WSS, optional Sentry ingest, plus dev localhost WebSocket. Expand with env vars below.
- **Frames:** YouTube / youtube-nocookie (trailers) and same origin.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Adds Supabase `https` + `wss` to `connect-src` and the project origin to `img-src` |
| `NEXT_PUBLIC_SENTRY_DSN` | Adds the ingest host to `connect-src` |
| `NEXT_PUBLIC_APP_URL` | Optional; adds that origin to `connect-src` |
| `CSP_EXTRA_CONNECT_SRC` | Space- or comma-separated extra hosts (e.g. LAN `http://10.0.0.1:3000` during device testing) |
| `CSP_EXTRA_IMG_SRC` | Extra `img-src` values |
| `CSP_CAPACITOR_EXTRA_SRCS` | Extra `connect-src` for Capacitor-only origins or plugins (see [Capacitor](#capacitor) |

## Web (Next.js)

- Policy is set in `next.config.ts` → `headers()`.
- After changing policy logic or env, run a production build and open DevTools → **Console** to ensure nothing is blocked.

## Capacitor (mobile)

When `capacitor.config.ts` points `server.url` at your deployed app, the **WebView loads that origin**; the same CSP headers are returned as for the browser. No second policy file is required for a remote URL.

- Use **`CSP_CAPACITOR_EXTRA_SRCS`** (or `CSP_EXTRA_CONNECT_SRC`) if a native plugin or a non-default URL needs to be whitelisted in `connect-src` (e.g. custom backend during QA).
- For **on-device** Next dev, add the machine’s IP/port via `CSP_EXTRA_CONNECT_SRC` and run with `next dev` from that host or tunnel.
- `allowMixedContent` / `cleartext` stay in Capacitor config; CSP is an additional, app-level control on top of HTTPS for remote content.

## Relaxing the policy (not recommended)

- Do not reintroduce `beforeInteractive` **inline** scripts in `layout.tsx` without a nonce or hash, or the browser will block them under a strict `script-src`.

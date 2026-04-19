# CineMatch

**CineMatch** is a mobile-first web app for discovering films, saving picks, linking with friends, and sharing watchlists—built as a polished Next.js experience with optional Supabase auth, TMDB-backed catalog data, and an Android shell via Capacitor.

---

## Summary

| | |
| --- | --- |
| **Goal** | Swipe-style **Discover**, curate **Picks**, manage **Linked** people, collaborate on a **Shared** watchlist, and tune taste in **Profile** / **Settings**. |
| **Stack** | **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind CSS 4**, **Supabase** client + API routes, **Stripe** hooks where billing applies, **Capacitor 8** for Android. |
| **Data** | UI-first **mock / sync** layer for fast local iteration; **TMDB** for real posters, metadata, and search when configured; **Supabase** schema and SQL under `database/` and `supabase/migrations/` for production-shaped data. |
| **Distribution** | Installable feel via **Web App Manifest** and icons under `public/icons/` (optional CDN icon via `NEXT_PUBLIC_APP_ICON_URL`). Native builds through **`android/`** + `npm run cap:*`. |

---

## Features (at a glance)

- **Discover** — Genre filters, swipe accept/reject, undo, match-style feedback, onboarding nudges.
- **Picks** — Saved titles, watched flow, recommendations, sharing back to shared lists, trailers where available.
- **Linked** — Invite links, accept flow, friend connections.
- **Shared** — Shared watchlist toggles, mutual picks, expandable rows.
- **Profile & Settings** — Avatar, bio, discovery preferences, achievements, theme, subscription entry points.
- **Auth** — Email/password and related API routes; magic-link / signup email flows when mail is configured.
- **Admin** — Dashboard routes exist for operations (lock down credentials before any public admin use).

---

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:3000** (dev server binds `0.0.0.0` so LAN devices can hit it).

```bash
npm run build   # production build
npm start       # run production server
npm run lint    # eslint
```

---

## Environment variables

Create **`.env.local`** in the project root (never commit real secrets). Common keys:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin operations (protect fiercely) |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL for auth emails and invite links |
| `TMDB_API_READ_ACCESS_TOKEN` **or** `TMDB_API_KEY` | [TMDB](https://developer.themoviedb.org/) catalog + images |
| `NEXT_PUBLIC_APP_ICON_URL` | Optional HTTPS PNG (≥512 recommended) for PWA / home-screen icon |
| `ADMIN_ENTRY_PATH` | Secret URL path that opens the admin dashboard (see below); **set your own value in production** |
| Stripe / checkout URLs | As needed for subscription flows (`NEXT_PUBLIC_PRO_CHECKOUT_*` patterns in server code) |

Without TMDB, the app still runs using built-in / mock paths; with TMDB, Discover and search enrich from the live catalog.

---

## Admin dashboard (hidden URL)

The UI is **not** meant to be opened at `/admin` in the browser bar. `src/middleware.ts` only serves the admin app when you hit a **separate, hard-to-guess path** (it rewrites internally and strips direct `/admin` access without that handshake).

| | |
| --- | --- |
| **Env** | `ADMIN_ENTRY_PATH` — must start with `/` (e.g. `/ops/a7f3-9k2-private`). |
| **Default** (if unset) | `/studio/portal-v9-a9k2m7r4xq` |

**Examples**

- Local: `http://localhost:3000/studio/portal-v9-a9k2m7r4xq` (or your `ADMIN_ENTRY_PATH` value)
- Hosted: `https://<your-domain><ADMIN_ENTRY_PATH>`

Override the default in **`.env.local`** / production env so the repo default is not a known entry on the public internet.

---

## TMDB setup (real movies)

1. Create a [TMDB](https://www.themoviedb.org/) account and open API settings.
2. Create a **Read Access Token** (preferred) or **API Key**.
3. Add to `.env.local`:
   - `TMDB_API_READ_ACCESS_TOKEN=...` **or**
   - `TMDB_API_KEY=...`
4. Restart `npm run dev`.

---

## Demo login (local only)

Example credentials sometimes used for **local UI smoke tests** (change or remove before any real deployment):

- Email: `admin@cinematch.app`
- Password: `admin123`

Treat these as **non-production** only; use strong secrets, RLS, and env-based admin auth in production.

---

## Android (Capacitor)

The `android/` project targets the deployed app (`https://cinematch.ca` in `capacitor.config.ts`—adjust for your host).

```bash
npm run cap:sync        # copy web assets / config into Android
npm run cap:open:android
npm run cap:run:android
```

Build signed release APKs / App Bundles from **Android Studio** (Build → Build Bundle(s) / APK(s)).

---

## Repository map

| Path | What |
| --- | --- |
| `src/app/` | App Router pages, layouts, API route handlers |
| `src/lib/` | Client state, hooks, Supabase helpers, shared logic |
| `src/components/` | Reusable UI |
| `database/schema.sql` | Reference SQL schema |
| `supabase/migrations/` | Incremental DB migrations |
| `docs/` | Security notes, visual system, etc. |
| `NEXT_TASKS.md` | Short prioritized follow-ups |
| `IMPROVEMENT_CHECKLIST.md` | Deeper backlog and completed items |

---

## Contributing / next steps

See **`NEXT_TASKS.md`** and **`IMPROVEMENT_CHECKLIST.md`** for security hardening (admin auth, Zod on APIs, error boundaries, tests, CI) before treating this as production-ready.

---

_CineMatch — movie matching for the small screen._

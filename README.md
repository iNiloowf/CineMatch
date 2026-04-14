# CineMatch

Mobile-first movie matching app built with Next.js and Tailwind CSS.

## What is included

- Login and signup flow with seeded demo access
- Discover screen with accept and reject movie actions
- Accepted Movies / Your Picks page
- Linked People page
- Shared Watchlist with watched checkboxes and progress sliders
- Ongoing page for unfinished shared movies
- Profile and Settings pages
- Mock-first state layer so the UI works immediately
- Backend route handlers for auth, movies, swipes, links, shared watchlists, profile, and settings
- Beginner-friendly SQL schema in [database/schema.sql](/C:/Users/niloo/Documents/New%20project/database/schema.sql)

## Run it

```bash
npm run dev
```

Open `http://localhost:3000`.

## Real movie API

This app now supports [TMDB](https://developer.themoviedb.org/) as its real movie catalog source.

1. Create a TMDB account.
2. Get an API Read Access Token from your TMDB API settings.
3. Copy `.env.example` to `.env.local`.
4. Add `TMDB_API_READ_ACCESS_TOKEN=...`
5. Restart the dev server.

When the key is present, the app keeps the current mock data for safety and also pulls in real TMDB movies for Discover.

## Demo account

- Email: `mia@cinematch.app`
- Password: `password123`

## Project notes

- The frontend uses browser-persisted mock data first so the app is smooth and runnable right away.
- The backend route handlers use an in-memory mock database in `src/server/mock-db.ts`.
- The SQL schema is ready for the next step if you want to move this to Supabase or Postgres.
- TMDB covers the movie fields we need for this app: title, poster, overview, rating, year, runtime, and genres.

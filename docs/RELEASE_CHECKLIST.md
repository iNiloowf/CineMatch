# Store release checklist (Android / Play)

Use this for every **production** build you intend to ship. Details: [GOOGLE_PLAY_PUBLISHING.md](./GOOGLE_PLAY_PUBLISHING.md).

## Before you build

1. **QA** — On a real device: `npm run cap:sync`, install the debug or release build, walk through [MANUAL_QA.md](./MANUAL_QA.md) (auth, Discover, Picks, Shared, offline banner if applicable).
2. **Versions** — Bump in `android/app/build.gradle`:
   - `versionCode` — integer, must increase for every Play upload.
   - `versionName` — user-visible label (e.g. `1.0.3`).
3. **Web** — Deploy the Next.js app that matches what Capacitor loads (`server.url` in `capacitor.config.ts` if you use live reload).
4. **Secrets** — Keystore and Play signing keys stay **outside** git; use Play App Signing as recommended by Google.

## Build

5. **Sync** — `npm run cap:sync` after any web asset or Capacitor config change.
6. **Signed AAB** — In Android Studio: **Build → Generate Signed Bundle / APK** → **Android App Bundle** for Play upload.

## Play Console

7. **Data Safety** — Matches your Privacy Policy and real data collection.
8. **Privacy policy URL** — HTTPS production URL (e.g. `/privacy`).
9. **Screenshots / feature graphic** — Per Play requirements.
10. **Release notes** — Short, user-facing changes.

## After release

11. Tag git (optional): `v1.0.3` aligned with `versionName`.
12. Monitor errors — If `NEXT_PUBLIC_SENTRY_DSN` is set, check Sentry for spikes.

# Manual QA — CineMatch

Use this checklist before a release or after risky changes (auth, sync, payments, Discover, Picks).

## Environment

- [ ] `npm run build` succeeds locally.
- [ ] `npm test` passes.
- [ ] Dev or staging URL matches the branch under test.

## Auth & session

- [ ] **Email/password login** on `/` — errors show clearly; success lands in the app.
- [ ] **Signup** on `/signup` — validation messages; success path.
- [ ] **OAuth** (if enabled) — completes; returns to app without a blank screen.
- [ ] **`/auth/callback`** — safe-area padding on mobile; **Try again** works after a forced failure (e.g. airplane mode during exchange).
- [ ] **Logged-out** access to protected routes shows **ProtectedScreen** (spinner + redirect), not a broken page.

## Discover

- [ ] **Swipe** accept / reject / undo behaves as expected.
- [ ] **Deep link** `discover?movieId=…` (or your app’s equivalent) opens the right title and does not crash on refresh.
- [ ] **Offline / slow network** — banner appears; no infinite spinners without recovery; retry path is obvious.

## Picks & shared lists

- [ ] **Queue / Watched** tabs load; actions sync after navigation away and back.
- [ ] **Long lists** (24+ rows) — scroll is smooth; virtualized lists still allow actions (open details, remove, etc.).
- [ ] **Trailer modal** — opens; **Escape** closes; focus does not escape to the page behind while the modal is open.

## Modals (stacking)

- [ ] **Movie details** → **Watch trailer** — trailer appears above details; **Escape** closes trailer first, then details.
- [ ] **Tab** cycles within the active modal only (details alone; trailer when open).

## Friends & invites

- [ ] **Invite link** copy / open / accept flow works end-to-end.
- [ ] **Friend profile** opens from list; movie details from friend picks work.

## Settings & account

- [ ] **Settings** save and persist after reload.
- [ ] **Account sync** — reconnect after going offline (if applicable).

## Admin (if you use it)

- [ ] Only reachable via configured entry path + token; direct `/admin` without token is blocked.

## API / observability (optional)

- [ ] Responses include **`x-request-id`** when the Next.js **proxy** is enabled (same value on request and response for debugging).

## Android / Capacitor (if shipping mobile)

- [ ] `npx cap sync android` after web changes that affect native config.
- [ ] Smoke test on device: launch, login, Discover, Picks.

---

_Checklist is living documentation — extend when new flows ship._

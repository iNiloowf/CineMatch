# CineMatch Launch Today Checklist (30-45 min)

Use this for a same-day launch pass. Prioritize only blockers.

## 1) Database + Support Tickets (10 min)

- [ ] Run latest Supabase migration in production (including `support_tickets` table).
- [ ] Confirm `support_tickets` exists with indexes (`user_id`, `created_at`, `status`).
- [ ] Verify RLS behavior:
  - authenticated user can insert only with their own `user_id`
  - authenticated user can read only their own tickets
- [ ] Submit a real support ticket from app UI and confirm it is stored.

Launch blocker if failing: migration errors, missing table, or wrong RLS behavior.

## 2) Admin Path Smoke Test (10 min)

- [ ] Login as admin and open `/admin`.
- [ ] Confirm dashboard data loads from Supabase.
- [ ] Perform one key admin action end-to-end (for example status/update flow).
- [ ] Verify no visible auth bypass path from normal user flow.

Known risk to keep visible: hardcoded admin credentials are still listed as an urgent fix in project docs.

## 3) Core User Flow Smoke Test (10 min)

- [ ] `signup` and `login` both work.
- [ ] Main discovery/swipe flow works without runtime error.
- [ ] Invite/connect flow works (create + accept baseline path).
- [ ] Support ticket create flow works for normal user.

Launch blocker if failing: auth failure, blank screen, or API crash in core path.

## 4) Runtime Stability + Config (5-10 min)

- [ ] Production env vars are present and correct (Supabase URL/keys and admin secrets used by server routes).
- [ ] Build succeeds (`npm run build`).
- [ ] Lint passes (`npm run lint`).
- [ ] Watch logs for obvious 4xx/5xx spikes during smoke test.

## 5) Release Decision

Ship now only if all are true:

- [ ] No blocker failed in sections 1-4.
- [ ] Admin and support ticket flows both work in production.
- [ ] Team accepts current known risks for post-launch follow-up.

## Immediate Post-Launch (next 24-72h)

- [ ] Remove hardcoded admin credentials from client/API paths.
- [ ] Add `error.tsx` and `global-error.tsx`.
- [ ] Add API request validation (Zod or equivalent).
- [ ] Add minimum `npm test` baseline and CI gate.

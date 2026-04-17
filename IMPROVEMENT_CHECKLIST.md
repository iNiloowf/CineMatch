# CineMatch — Improvement Checklist

## Done

- [x] Discover: top-right menu wired (settings / profile / paste link / dark mode).
- [x] Design tokens (spacing, radius, shadow, font scale, colors) + button hierarchy (primary/secondary/ghost).
- [x] Icon sizing/stroke consistent (discover, picks, profile, modals).
- [x] Modal/sheet layout unified (header/body/footer, close, safe area).
- [x] Visual noise: fewer competing gradients/glows where readability suffered.
- [x] Narrow-width pass (~≤380px): chips/buttons avoid clipping on small Android.

## Priority — product & stability

- [x] Loading / error / empty for all network actions (search, trailer, sync, invite) + retry CTA.
- [ ] Route guards on authenticated app routes (no blank states for logged-out users).
- [x] Split `app-state` into domain hooks; replace 7s polling with focus/visibility + events + manual refresh.

## UI & UX (condensed)

- [x] Dark mode: better contrast on muted/meta text and tinted surfaces.
- [x] Skeletons for cards/search rows; clearer empty/error/success patterns.
- [x] One visual system: type scale, vertical rhythm, radius/elevation by role, chip/badge grammar, input states, z-index scale doc.
- [x] A11y: focus rings, 44px targets where needed, Escape closes modals, icon-only ARIA.
- [ ] Motion: shared durations/easings + reduced-motion alternatives beyond global slow-down.
- [x] Onboarding nudges (Discover gestures, filters, undo); preserve discover context on return; Picks share feedback (toast); “no results” hints + actions.

## Engineering

- [ ] Perf: memoize lists, lazy modals/trailer, poster image policy, trim unstable props/callbacks; occasional `next build` + analyzer on big changes.
- [ ] API: Zod on `src/app/api/*`, dedupe/cache search + trailer, shared filter utils client+server, centralized errors/logging.
- [ ] Security: Supabase session storage review, auth+ownership on mutating routes, rate limits (invites/accept/swipe), audit logs for sensitive actions, RLS/storage for avatars.
- [ ] Tests & CI: unit (discover utils), integration (auth/sync), e2e (login, swipe/undo, invite, shared toggles), visual smoke dark/light, CI gates (typecheck, lint, test).

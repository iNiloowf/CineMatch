# Bundle budget (First Load JS)

After **large** UI changes, new routes, or dependency upgrades, measure client JS so Discover/Picks stay fast.

## Command

```bash
npm run analyze
```

This sets `ANALYZE=true` and runs `next build` with `@next/bundle-analyzer`. Open the generated report in the browser when the build finishes.

## What to watch

- **First Load JS** on heavy routes (`/discover`, `/picks`, `/shared`) — compare before/after a change; large jumps deserve a quick look (dynamic imports, deduping icons, avoiding huge deps on the critical path).
- **Shared chunks** — Unexpected growth often comes from adding a big library to a shared layout import.

## CI

`npm test` and `npm run build` run in GitHub Actions; bundle analysis is **manual** (no hard gate in CI) to avoid flaky size limits across machines.

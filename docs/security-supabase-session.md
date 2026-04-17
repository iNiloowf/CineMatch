# Supabase session storage (CineMatch)

## Browser client (`src/lib/supabase/client.ts`)

- **Persistence:** Sessions are stored in **`localStorage`** under a fixed **`storageKey`** (`cinematch-supabase-auth`) so they survive refresh and do not rely on legacy `sb-*` cookies (those are cleared on client init to avoid stale conflicts).
- **Flow:** **`flowType: "pkce"`** for the public client (recommended for SPAs).
- **Refresh:** **`autoRefreshToken: true`** keeps access tokens valid while the tab is open.

## Server-side API routes

- **Do not trust JWT payload alone.** Use **`verifyBearerFromRequest`** (`src/server/supabase-auth-verify.ts`), which calls **`supabase.auth.getUser(accessToken)`** with the service-role client to validate signature, expiry, and user id when `SUPABASE_SERVICE_ROLE_KEY` is set.
- **Without service role** (local demo): verification falls back to decode-only checks — acceptable for offline mocks only.

## Avatars & RLS

- **Storage:** Bucket **`profile-photos`** with policies in `database/schema.sql` — authenticated users may insert/update/delete only objects whose path prefix matches **`auth.uid()`** (see `storage.foldername(name)` checks).
- **Profiles:** Row-level policies restrict **select/update** to the owner (and linked partners for read where defined).

## Rate limits & audit

- Sensitive routes apply **in-memory rate limits** (`src/server/rate-limit.ts`). For horizontal scale, replace with Redis / Upstash keyed by user id + route.
- **Audit log:** Table **`security_audit_log`** (migration `20260417000000_security_audit_log.sql`) receives events from `logSecurityAudit` when migrations are applied.

# Supabase session storage (CineMatch)

## Browser client (`src/lib/supabase/client.ts`)

- **Persistence:** Sessions are stored in **`localStorage`** under a fixed **`storageKey`** (`cinematch-supabase-auth`) so they survive refresh and do not rely on legacy `sb-*` cookies (those are cleared on client init to avoid stale conflicts).
- **Flow:** **`flowType: "pkce"`** for the public client (recommended for SPAs).
- **Refresh:** **`autoRefreshToken: true`** keeps access tokens valid while the tab is open.

## Server-side API routes

- **Do not trust JWT payload alone.** Use **`requireAuthenticatedUser` / `requireAuthenticatedUserWithAdmin`** (`src/server/api-auth-guard.ts`) or **`verifySupabaseBearer`** (`src/server/supabase-auth-verify.ts`), which call **`auth.getUser(accessToken)`** on the service-role client. If the service role is not configured, the API returns **503** (no decode-only / silent bypass).

## Avatars & RLS

- **Storage:** Bucket **`profile-photos`** with policies in `database/schema.sql` — authenticated users may insert/update/delete only objects whose path prefix matches **`auth.uid()`** (see `storage.foldername(name)` checks).
- **Profiles:** Row-level policies restrict **select/update** to the owner (and linked partners for read where defined).

## Rate limits & audit

- Sensitive routes apply **in-memory rate limits** (`src/server/rate-limit.ts`). For horizontal scale, replace with Redis / Upstash keyed by user id + route.
- **Audit log:** Table **`security_audit_log`** (migration `20260417000000_security_audit_log.sql`) receives events from `logSecurityAudit` when migrations are applied.

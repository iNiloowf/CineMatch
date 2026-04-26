/**
 * Production startup: Supabase project URL and service role key are mandatory so the server can
 * validate access JWTs (signature + user) and use the service client. No decode-only fallbacks.
 */
export function assertSupabaseServiceRoleInProduction() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (missing.length === 0) {
    return;
  }

  const detail =
    "The server will not start: bearer authentication requires Supabase admin auth.getUser() (full JWT validation). " +
    "Set the listed variable(s) in the deployment environment. See .env.example.";
  const message = `[FATAL] Server auth is misconfigured — missing: ${missing.join(", ")}. ${detail}`;

  console.error(message);
  throw new Error(message);
}

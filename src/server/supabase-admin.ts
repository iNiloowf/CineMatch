import { createClient } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createClient> | null = null;
let devMissingKeyLogged = false;

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!supabaseUrl || !serviceRoleKey) {
      const missing = [
        !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
        !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
      ].filter((entry): entry is string => Boolean(entry));
      const message = `[FATAL] Supabase service client unavailable — missing: ${missing.join(
        ", ",
      )}. JWT validation and admin operations require these in production. See .env.example.`;
      console.error(message);
      throw new Error(message);
    }
  } else {
    if (!supabaseUrl || !serviceRoleKey) {
      if (!devMissingKeyLogged) {
        devMissingKeyLogged = true;
        const missing = [
          !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
          !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
        ].filter((entry): entry is string => Boolean(entry));
        console.warn(
          `[auth] ${missing.join(", ")} not set — bearer-protected API routes return 401; add them to .env.local for local auth.`,
        );
      }
      return null;
    }
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

import { assertSupabaseServiceRoleInProduction } from "@/server/required-server-env";

/**
 * Next.js instrumentation. Sentry loads when `NEXT_PUBLIC_SENTRY_DSN` is set.
 * Correlate with `x-request-id` in your own logs; optional `SENTRY_ORG` / `SENTRY_PROJECT` for source maps via CI.
 */
export async function register() {
  assertSupabaseServiceRoleInProduction();
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    await import("./sentry.server.config");
  }
}

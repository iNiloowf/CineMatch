import { getSupabaseAdminClient } from "@/server/supabase-admin";

export type SecurityAuditPayload = {
  action: string;
  actorUserId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Persists a row to `security_audit_log` when Supabase is configured and the table exists.
 * Failures are swallowed so API routes stay available if the migration has not been applied yet.
 */
export async function logSecurityAudit(payload: SecurityAuditPayload): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return;
  }

  const row = {
    action: payload.action,
    actor_user_id: payload.actorUserId ?? null,
    ip: payload.ip ?? null,
    metadata: payload.metadata ?? {},
  };

  const { error } = await admin.from("security_audit_log").insert(row as never);

  if (error && process.env.NODE_ENV === "development") {
    console.warn("[security-audit]", error.message);
  }
}

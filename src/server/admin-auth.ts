import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { API_ERROR_CODES, apiJsonError } from "@/server/api-response";
import { mapBearerFailureToResponse } from "@/server/api-auth-guard";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { verifySupabaseBearer } from "@/server/supabase-auth-verify";

type AdminIdentity = {
  userId: string;
  email: string | null;
  role: string | null;
};

type RequireServerAdminResult =
  | {
      ok: true;
      identity: AdminIdentity;
      supabaseAdmin: SupabaseClient;
    }
  | {
      ok: false;
      response: NextResponse;
    };

function parseEnvList(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function addEnvEmail(target: Set<string>, value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (normalized) {
    target.add(normalized);
  }
}

function hasAdminRole(appMetadata: Record<string, unknown> | undefined) {
  if (!appMetadata) {
    return false;
  }

  const role = appMetadata.role;
  if (typeof role === "string" && role.toLowerCase() === "admin") {
    return true;
  }

  const roles = appMetadata.roles;
  if (Array.isArray(roles)) {
    return roles.some(
      (entry) => typeof entry === "string" && entry.toLowerCase() === "admin",
    );
  }

  return false;
}

export async function requireServerAdmin(
  request: NextRequest,
): Promise<RequireServerAdminResult> {
  const v = await verifySupabaseBearer(request);
  if (!v.ok) {
    return { ok: false, response: mapBearerFailureToResponse(v, request) };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return {
      ok: false,
      response: apiJsonError(
        503,
        "Admin endpoints are not available. Authentication could not be verified.",
        { code: API_ERROR_CODES.SERVICE_UNAVAILABLE, request },
      ),
    };
  }

  const su = v.user;
  const email = su.email?.trim().toLowerCase() ?? null;
  const role =
    typeof su.app_metadata?.role === "string" ? su.app_metadata.role : null;
  /** Server-only env — never use NEXT_PUBLIC_* for allowlists (would ship to the client). */
  const adminIds = parseEnvList(process.env.ADMIN_USER_IDS);
  const adminEmails = parseEnvList(process.env.ADMIN_EMAILS);
  addEnvEmail(adminEmails, process.env.ADMIN_DASHBOARD_EMAIL);
  addEnvEmail(adminEmails, process.env.ADMIN_EMAIL);
  const allowlistedById = adminIds.has(su.id.toLowerCase());
  const allowlistedByEmail = email ? adminEmails.has(email) : false;
  const isAdmin = hasAdminRole(su.app_metadata) || allowlistedById || allowlistedByEmail;

  if (!isAdmin) {
    return {
      ok: false,
      response: apiJsonError(
        403,
        "Your account does not have admin access. Set ADMIN_EMAILS / ADMIN_USER_IDS (or Supabase app_metadata.role=admin) on the server and restart.",
        { code: API_ERROR_CODES.FORBIDDEN, request },
      ),
    };
  }

  return {
    ok: true,
    supabaseAdmin,
    identity: {
      userId: su.id,
      email,
      role,
    },
  };
}

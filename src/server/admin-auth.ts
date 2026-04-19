import type { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { API_ERROR_CODES, apiJsonError } from "@/server/api-response";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { getSupabaseAdminClient } from "@/server/supabase-admin";

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

function getEnv(primary: string, fallbackPublic: string) {
  return process.env[primary] ?? process.env[fallbackPublic];
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
  const auth = await verifyBearerFromRequest(request);
  if (!auth) {
    return {
      ok: false,
      response: apiJsonError(401, "You must be signed in to use admin endpoints.", {
        code: API_ERROR_CODES.UNAUTHORIZED,
      }),
    };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return {
      ok: false,
      response: apiJsonError(
        500,
        "Admin endpoints are not configured on the server yet.",
        { code: API_ERROR_CODES.INTERNAL },
      ),
    };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(auth.accessToken);
  if (error || !data.user) {
    return {
      ok: false,
      response: apiJsonError(401, "Admin session could not be verified.", {
        code: API_ERROR_CODES.UNAUTHORIZED,
      }),
    };
  }

  const email = data.user.email?.trim().toLowerCase() ?? null;
  const role =
    typeof data.user.app_metadata?.role === "string"
      ? data.user.app_metadata.role
      : null;
  const adminIds = parseEnvList(getEnv("ADMIN_USER_IDS", "NEXT_PUBLIC_ADMIN_USER_IDS"));
  const adminEmails = parseEnvList(getEnv("ADMIN_EMAILS", "NEXT_PUBLIC_ADMIN_EMAILS"));
  addEnvEmail(adminEmails, getEnv("ADMIN_DASHBOARD_EMAIL", "NEXT_PUBLIC_ADMIN_DASHBOARD_EMAIL"));
  addEnvEmail(adminEmails, getEnv("ADMIN_EMAIL", "NEXT_PUBLIC_ADMIN_EMAIL"));
  const allowlistedById = adminIds.has(data.user.id.toLowerCase());
  const allowlistedByEmail = email ? adminEmails.has(email) : false;
  const isAdmin = hasAdminRole(data.user.app_metadata) || allowlistedById || allowlistedByEmail;

  if (!isAdmin) {
    return {
      ok: false,
      response: apiJsonError(
        403,
        "Your account does not have admin access. Add your email to ADMIN_DASHBOARD_EMAIL or ADMIN_EMAILS and restart the server.",
        { code: API_ERROR_CODES.FORBIDDEN },
      ),
    };
  }

  return {
    ok: true,
    supabaseAdmin,
    identity: {
      userId: data.user.id,
      email,
      role,
    },
  };
}

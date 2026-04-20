import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SettingsRow } from "@/lib/account-sync/types";
import { DEFAULT_SETTINGS_ROW_BASE } from "@/lib/account-sync/types";

type SupabaseErrorLike = {
  message?: string;
  code?: string;
} | null;

type AuthMetadataLike = Record<string, unknown> | null | undefined;

let settingsSupportsReduceMotion: boolean | null = null;

function isMissingReduceMotionColumnError(error: SupabaseErrorLike) {
  if (!error) {
    return false;
  }

  const normalized = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    (normalized.includes("reduce_motion") &&
      (normalized.includes("column") || normalized.includes("schema cache")))
  );
}

export function isMissingOptionalSettingsColumnError(
  error: SupabaseErrorLike,
  columnName: string,
) {
  if (!error) {
    return false;
  }
  const normalized = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    (normalized.includes(columnName.toLowerCase()) &&
      (normalized.includes("column") || normalized.includes("schema cache")))
  );
}

function readSubscriptionTierFromMetadata(metadata: AuthMetadataLike): "free" | "pro" {
  if (!metadata || typeof metadata !== "object") {
    return "free";
  }
  const raw = metadata.subscription_tier ?? metadata.subscriptionTier;
  return raw === "pro" ? "pro" : "free";
}

function readAdminSimulateFromMetadata(metadata: AuthMetadataLike): boolean {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }
  const raw = metadata.admin_mode_simulate_pro ?? metadata.adminModeSimulatePro;
  return raw === true;
}

async function getAuthSubscriptionFallback(
  supabaseClient: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
) {
  const authUserResult = await supabaseClient.auth.getUser();
  const metadata = (authUserResult.data.user?.app_metadata ?? {}) as Record<string, unknown>;
  return {
    subscriptionTier: readSubscriptionTierFromMetadata(metadata),
    adminModeSimulatePro: readAdminSimulateFromMetadata(metadata),
  };
}

export async function fetchSettingsRowForSync(
  supabaseClient: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
  activeUserId: string,
): Promise<{ data: SettingsRow | null; error: SupabaseErrorLike }> {
  const baseSelect =
    "user_id, dark_mode, notifications, autoplay_trailers, hide_spoilers, cellular_sync";
  const selectWithAllOptionalColumns = `${baseSelect}, reduce_motion, subscription_tier, admin_mode_simulate_pro`;
  const selectWithoutSubscriptionColumns = `${baseSelect}, reduce_motion`;
  const selectWithoutOptionalColumns = baseSelect;

  const primarySelect =
    settingsSupportsReduceMotion === false
      ? selectWithoutSubscriptionColumns
      : selectWithAllOptionalColumns;

  const primaryResult = await supabaseClient
    .from("settings")
    .select(primarySelect)
    .eq("user_id", activeUserId)
    .maybeSingle();

  if (!primaryResult.error) {
    if (primarySelect === selectWithAllOptionalColumns) {
      settingsSupportsReduceMotion = true;
      if (!primaryResult.data) {
        const authSubscriptionFallback = await getAuthSubscriptionFallback(supabaseClient);
        return {
          data: {
            user_id: activeUserId,
            ...DEFAULT_SETTINGS_ROW_BASE,
            reduce_motion: false,
            subscription_tier: authSubscriptionFallback.subscriptionTier,
            admin_mode_simulate_pro: authSubscriptionFallback.adminModeSimulatePro,
          } as SettingsRow,
          error: null,
        };
      }
      return {
        data: (primaryResult.data ?? null) as SettingsRow | null,
        error: null,
      };
    }

    const authSubscriptionFallback = await getAuthSubscriptionFallback(supabaseClient);
    return {
      data: (primaryResult.data
        ? ({
            ...(primaryResult.data as Record<string, unknown>),
            reduce_motion: null,
            subscription_tier: authSubscriptionFallback.subscriptionTier,
            admin_mode_simulate_pro: authSubscriptionFallback.adminModeSimulatePro,
          } as SettingsRow)
        : ({
            user_id: activeUserId,
            ...DEFAULT_SETTINGS_ROW_BASE,
            reduce_motion: false,
            subscription_tier: authSubscriptionFallback.subscriptionTier,
            admin_mode_simulate_pro: authSubscriptionFallback.adminModeSimulatePro,
          } as SettingsRow)),
      error: null,
    };
  }

  const primaryError = primaryResult.error as SupabaseErrorLike;
  const missingReduceMotion = isMissingReduceMotionColumnError(primaryError);
  const missingSubscriptionTier = isMissingOptionalSettingsColumnError(
    primaryError,
    "subscription_tier",
  );
  const missingAdminSimulate = isMissingOptionalSettingsColumnError(
    primaryError,
    "admin_mode_simulate_pro",
  );

  if (!missingReduceMotion && !missingSubscriptionTier && !missingAdminSimulate) {
    return { data: null, error: primaryResult.error as SupabaseErrorLike };
  }

  const fallbackSelect = missingReduceMotion
    ? selectWithoutOptionalColumns
    : selectWithoutSubscriptionColumns;
  settingsSupportsReduceMotion = !missingReduceMotion;

  const fallbackResult = await supabaseClient
    .from("settings")
    .select(fallbackSelect)
    .eq("user_id", activeUserId)
    .maybeSingle();

  if (fallbackResult.error) {
    return { data: null, error: fallbackResult.error as SupabaseErrorLike };
  }

  const authSubscriptionFallback = await getAuthSubscriptionFallback(supabaseClient);
  return {
    data: (fallbackResult.data
      ? ({
          ...(fallbackResult.data as Record<string, unknown>),
          reduce_motion:
            missingReduceMotion
              ? null
              : (fallbackResult.data as { reduce_motion?: boolean | null }).reduce_motion ?? null,
          subscription_tier: authSubscriptionFallback.subscriptionTier,
          admin_mode_simulate_pro: authSubscriptionFallback.adminModeSimulatePro,
        } as SettingsRow)
      : ({
          user_id: activeUserId,
          ...DEFAULT_SETTINGS_ROW_BASE,
          reduce_motion: false,
          subscription_tier: authSubscriptionFallback.subscriptionTier,
          admin_mode_simulate_pro: authSubscriptionFallback.adminModeSimulatePro,
        } as SettingsRow)),
    error: null,
  };
}

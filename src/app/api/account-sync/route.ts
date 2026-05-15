import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuthenticatedUserWithAdmin } from "@/server/api-auth-guard";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { checkRateLimit } from "@/server/rate-limit";

type ProfileRow = {
  id: string;
  email: string;
  public_handle?: string;
  full_name: string;
  avatar_text: string;
  avatar_image_url?: string | null;
  bio: string;
  city: string;
  profile_style?: "classic" | "glass" | "neon" | "rainbow" | null;
};

type SettingsRow = {
  user_id: string;
  dark_mode: boolean;
  notifications: boolean;
  autoplay_trailers: boolean;
  hide_spoilers: boolean;
  cellular_sync: boolean;
  reduce_motion?: boolean | null;
  subscription_tier?: "free" | "pro" | null;
  admin_mode_simulate_pro?: boolean | null;
  onboarding_preferences?: unknown | null;
};

type LinkRow = {
  id: string;
  requester_id: string;
  target_id: string;
  status: "accepted" | "pending";
  created_at: string;
};

type InviteRow = {
  id: string;
  inviter_id: string;
  token: string;
  created_at: string;
  used_at: string | null;
  link_code: string | null;
};

type SwipeRow = {
  user_id: string;
  movie_id: string;
  decision: "accepted" | "rejected";
  created_at: string;
};

type SharedWatchRow = {
  id: string;
  linked_user_id: string;
  movie_id: string;
  watched: boolean;
  updated_at: string;
};

type WatchedPickReviewRow = {
  id: string;
  user_id: string;
  movie_id: string;
  recommended: boolean;
  watched_at: string;
};

type MovieRow = {
  id: string;
  title: string;
  release_year: number;
  runtime: string;
  rating: number;
  genres: string[];
  description: string;
  poster_eyebrow: string;
  poster_image_url?: string | null;
  accent_from: string;
  accent_to: string;
  trailer_url?: string | null;
};
type AuthMetadataLike = Record<string, unknown> | null | undefined;
const DEFAULT_SETTINGS_ROW_BASE = {
  dark_mode: false,
  notifications: true,
  autoplay_trailers: false,
  hide_spoilers: true,
  cellular_sync: true,
} as const;

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }

  return output;
}

const SYNC_WINDOW_MS = 60 * 1000;
/** Room for debounced Realtime + focus without 429 loops during normal use */
const SYNC_MAX = 90;

function isMissingOptionalSettingsColumnError(
  error: { message?: string; code?: string } | null,
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
  const raw =
    metadata.subscription_tier ??
    metadata.subscriptionTier;
  return raw === "pro" ? "pro" : "free";
}

function readAdminSimulateFromMetadata(metadata: AuthMetadataLike): boolean {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }
  const raw =
    metadata.admin_mode_simulate_pro ??
    metadata.adminModeSimulatePro;
  return raw === true;
}

async function fetchSettingsRow(userId: string, supabaseAdmin: SupabaseClient) {
  const fullSelectBase =
    "user_id, dark_mode, notifications, autoplay_trailers, hide_spoilers, cellular_sync, reduce_motion, subscription_tier, admin_mode_simulate_pro";
  const fullSelectWithOnboarding = `${fullSelectBase}, onboarding_preferences`;
  const fallbackSelect =
    "user_id, dark_mode, notifications, autoplay_trailers, hide_spoilers, cellular_sync, reduce_motion";

  let fullResult = await supabaseAdmin
    .from("settings")
    .select(fullSelectWithOnboarding)
    .eq("user_id", userId)
    .maybeSingle();

  let fullError = fullResult.error as { message?: string; code?: string } | null;
  if (
    fullError &&
    isMissingOptionalSettingsColumnError(fullError, "onboarding_preferences")
  ) {
    fullResult = await supabaseAdmin
      .from("settings")
      .select(fullSelectBase)
      .eq("user_id", userId)
      .maybeSingle();
    fullError = fullResult.error as { message?: string; code?: string } | null;
  }

  if (!fullError) {
    if (!fullResult.data) {
      const authUserResult = await supabaseAdmin.auth.admin.getUserById(userId);
      const authMetadata = (authUserResult.data?.user?.app_metadata ?? {}) as Record<string, unknown>;
      return {
        data: {
          user_id: userId,
          ...DEFAULT_SETTINGS_ROW_BASE,
          reduce_motion: false,
          subscription_tier: readSubscriptionTierFromMetadata(authMetadata),
          admin_mode_simulate_pro: readAdminSimulateFromMetadata(authMetadata),
        } as SettingsRow,
        error: null,
      };
    }
    return {
      data: (fullResult.data ?? null) as SettingsRow | null,
      error: null,
    };
  }

  const missingSubscriptionTier = isMissingOptionalSettingsColumnError(
    fullError,
    "subscription_tier",
  );
  const missingAdminSimulate = isMissingOptionalSettingsColumnError(
    fullError,
    "admin_mode_simulate_pro",
  );

  if (!missingSubscriptionTier && !missingAdminSimulate) {
    return { data: null, error: fullError };
  }

  const authUserResult = await supabaseAdmin.auth.admin.getUserById(userId);
  const authMetadata = (authUserResult.data?.user?.app_metadata ?? {}) as Record<string, unknown>;
  const fallbackSubscriptionTier = readSubscriptionTierFromMetadata(authMetadata);
  const fallbackAdminSimulate = readAdminSimulateFromMetadata(authMetadata);

  const fallbackResult = await supabaseAdmin
    .from("settings")
    .select(fallbackSelect)
    .eq("user_id", userId)
    .maybeSingle();
  if (fallbackResult.error) {
    return {
      data: null,
      error: fallbackResult.error as { message?: string; code?: string } | null,
    };
  }

  return {
    data: (fallbackResult.data
      ? ({
          ...(fallbackResult.data as Record<string, unknown>),
          subscription_tier: fallbackSubscriptionTier,
          admin_mode_simulate_pro: fallbackAdminSimulate,
        } as SettingsRow)
      : ({
          user_id: userId,
          ...DEFAULT_SETTINGS_ROW_BASE,
          reduce_motion: false,
          subscription_tier: fallbackSubscriptionTier,
          admin_mode_simulate_pro: fallbackAdminSimulate,
        } as SettingsRow)),
    error: null,
  };
}

/**
 * Linked friends’ `settings.subscription_tier` can lag Stripe / Auth updates.
 * Merge `app_metadata` so viewers see the same access-gated surfaces (e.g. achievement badges on friend profile).
 */
async function fetchPartnerSettingsRowWithAuthTier(
  partnerId: string,
  supabaseAdmin: SupabaseClient,
): Promise<SettingsRow | null> {
  const base = await fetchSettingsRow(partnerId, supabaseAdmin);
  if (!base.data) {
    return null;
  }
  try {
    const authUserResult = await supabaseAdmin.auth.admin.getUserById(partnerId);
    const metadata = (authUserResult.data?.user?.app_metadata ?? {}) as AuthMetadataLike;
    const metaTierPro = readSubscriptionTierFromMetadata(metadata) === "pro";
    const metaAdmin = readAdminSimulateFromMetadata(metadata);
    const dbTierPro = base.data.subscription_tier === "pro";
    const dbAdmin = base.data.admin_mode_simulate_pro === true;
    if (!metaTierPro && !metaAdmin && !dbTierPro && !dbAdmin) {
      return base.data;
    }
    return {
      ...base.data,
      subscription_tier: metaTierPro || dbTierPro ? "pro" : "free",
      admin_mode_simulate_pro: metaAdmin || dbAdmin,
    };
  } catch {
    return base.data;
  }
}

export async function GET(request: NextRequest) {
  const session = await requireAuthenticatedUserWithAdmin(request);
  if (!session.ok) {
    return session.response;
  }
  const { supabaseAdmin, auth } = session;
  const currentUserId = auth.userId;

  const syncRate = checkRateLimit({
    key: `account-sync:get:${currentUserId}`,
    max: SYNC_MAX,
    windowMs: SYNC_WINDOW_MS,
  });

  if (!syncRate.ok) {
    return apiJsonError(
      429,
      "Too many sync requests. Wait a moment and try again.",
      {
        code: API_ERROR_CODES.RATE_LIMITED,
        headers: { "Retry-After": String(syncRate.retryAfterSec) },
        request,
      },
    );
  }

  const settingsResult = await fetchSettingsRow(currentUserId, supabaseAdmin);

  const profileSelect =
    "id, email, public_handle, full_name, avatar_text, avatar_image_url, bio, city, profile_style, favorite_movie_id, favorite_movie_title, favorite_movie_year, favorite_movie_poster_url, favorite_movie_media_type, profile_header_movie_id, profile_header_movie_title, profile_header_movie_year, profile_header_poster_url, profile_header_media_type";

  const [profileResult, linksResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select(profileSelect)
      .eq("id", currentUserId)
      .maybeSingle(),
    supabaseAdmin
      .from("linked_users")
      .select("id, requester_id, target_id, status, created_at")
      .or(`requester_id.eq.${currentUserId},target_id.eq.${currentUserId}`),
  ]);

  const linkRows = (linksResult.data ?? []) as LinkRow[];
  const acceptedLinks = linkRows.filter((link) => link.status === "accepted");
  const acceptedPartnerIds = Array.from(
    new Set(
      acceptedLinks.map((link) =>
        link.requester_id === currentUserId ? link.target_id : link.requester_id,
      ),
    ),
  );
  const allLinkedProfileIds = Array.from(
    new Set(
      linkRows.map((link) =>
        link.requester_id === currentUserId ? link.target_id : link.requester_id,
      ),
    ),
  );
  const sharedLinkIds = acceptedLinks.map((link) => link.id);

  const reviewUserIds = [currentUserId, ...acceptedPartnerIds];
  const [partnerProfilesResult, ownSwipesResult, partnerAcceptedSwipesResult, sharedWatchResult, watchedPickReviewsResult] =
    await Promise.all([
      allLinkedProfileIds.length > 0
        ? supabaseAdmin
            .from("profiles")
            .select(profileSelect)
            .in("id", allLinkedProfileIds)
        : Promise.resolve({ data: [] as ProfileRow[] }),
      supabaseAdmin
        .from("swipes")
        .select("user_id, movie_id, decision, created_at")
        .eq("user_id", currentUserId),
      acceptedPartnerIds.length > 0
        ? supabaseAdmin
            .from("swipes")
            .select("user_id, movie_id, decision, created_at")
            .in("user_id", acceptedPartnerIds)
            .eq("decision", "accepted")
        : Promise.resolve({ data: [] as SwipeRow[] }),
      sharedLinkIds.length > 0
        ? supabaseAdmin
            .from("shared_watchlist")
            .select("id, linked_user_id, movie_id, watched, updated_at")
            .in("linked_user_id", sharedLinkIds)
        : Promise.resolve({ data: [] as SharedWatchRow[] }),
      supabaseAdmin
        .from("watched_pick_reviews")
        .select("id, user_id, movie_id, recommended, watched_at")
        .in("user_id", reviewUserIds),
    ]);

  const watchedPickReviewRows: WatchedPickReviewRow[] = watchedPickReviewsResult.error
    ? []
    : ((watchedPickReviewsResult.data ?? []) as WatchedPickReviewRow[]) ?? [];

  const swipeRows = [
    ...(((ownSwipesResult.data ?? []) as SwipeRow[]) ?? []),
    ...(((partnerAcceptedSwipesResult.data ?? []) as SwipeRow[]) ?? []),
  ];
  const movieIds = new Set(swipeRows.map((swipe) => swipe.movie_id));
  for (const row of watchedPickReviewRows) {
    movieIds.add(row.movie_id);
  }
  const movieIdList = Array.from(movieIds);

  const movieChunks = chunk(movieIdList, 150);
  const movieResults = await Promise.all(
    movieChunks.map((ids) =>
      ids.length === 0
        ? Promise.resolve({ data: [] as MovieRow[] })
        : supabaseAdmin
            .from("movies")
            .select(
              "id, title, release_year, runtime, rating, genres, description, poster_eyebrow, poster_image_url, accent_from, accent_to, trailer_url",
            )
            .in("id", ids),
    ),
  );

  const partnerSettingsResults =
    acceptedPartnerIds.length > 0
      ? await Promise.all(
          acceptedPartnerIds.map((partnerId) =>
            fetchPartnerSettingsRowWithAuthTier(partnerId, supabaseAdmin),
          ),
        )
      : [];
  const partnerSettings = partnerSettingsResults.filter(
    (row): row is SettingsRow => row != null,
  );

  return apiJsonOk(
    {
      profile: (profileResult.data ?? null) as ProfileRow | null,
      settings: settingsResult.data,
      links: linkRows,
      invites: [] as InviteRow[],
      partnerProfiles: (partnerProfilesResult.data ?? []) as ProfileRow[],
      partnerSettings,
      swipes: swipeRows,
      sharedWatch: (sharedWatchResult.data ?? []) as SharedWatchRow[],
      movies: movieResults.flatMap((result) => (result.data ?? []) as MovieRow[]),
      watchedPickReviews: watchedPickReviewRows,
    },
    request,
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { checkRateLimit } from "@/server/rate-limit";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";

type ProfileRow = {
  id: string;
  email: string;
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
const SYNC_MAX = 45;

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

async function fetchSettingsRow(
  userId: string,
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
) {
  const fullSelect =
    "user_id, dark_mode, notifications, autoplay_trailers, hide_spoilers, cellular_sync, reduce_motion, subscription_tier, admin_mode_simulate_pro";
  const fallbackSelect =
    "user_id, dark_mode, notifications, autoplay_trailers, hide_spoilers, cellular_sync, reduce_motion";

  const fullResult = await supabaseAdmin
    .from("settings")
    .select(fullSelect)
    .eq("user_id", userId)
    .maybeSingle();

  const fullError = fullResult.error as { message?: string; code?: string } | null;
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

export async function GET(request: NextRequest) {
  const authToken = await verifyBearerFromRequest(request);

  if (!authToken) {
    return NextResponse.json(
      { error: "You need to be logged in to sync account data." },
      { status: 401 },
    );
  }

  const syncRate = checkRateLimit({
    key: `account-sync:get:${authToken.userId}`,
    max: SYNC_MAX,
    windowMs: SYNC_WINDOW_MS,
  });

  if (!syncRate.ok) {
    return NextResponse.json(
      { error: "Too many sync requests. Wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(syncRate.retryAfterSec) },
      },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Account sync is not configured on the server yet." },
      { status: 500 },
    );
  }

  const currentUserId = authToken.userId;

  const settingsResult = await fetchSettingsRow(currentUserId, supabaseAdmin);

  const [profileResult, linksResult, invitesResult] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, avatar_text, avatar_image_url, bio, city, profile_style")
        .eq("id", currentUserId)
        .maybeSingle(),
      supabaseAdmin
        .from("linked_users")
        .select("id, requester_id, target_id, status, created_at")
        .or(`requester_id.eq.${currentUserId},target_id.eq.${currentUserId}`),
      supabaseAdmin
        .from("invite_links")
        .select("id, inviter_id, token, created_at, used_at")
        .eq("inviter_id", currentUserId)
        .order("created_at", { ascending: false }),
    ]);

  const linkRows = (linksResult.data ?? []) as LinkRow[];
  const partnerIds = Array.from(
    new Set(
      linkRows.map((link) =>
        link.requester_id === currentUserId ? link.target_id : link.requester_id,
      ),
    ),
  );
  const sharedLinkIds = linkRows.map((link) => link.id);

  const [partnerProfilesResult, ownSwipesResult, partnerAcceptedSwipesResult, sharedWatchResult] =
    await Promise.all([
      partnerIds.length > 0
        ? supabaseAdmin
            .from("profiles")
            .select("id, email, full_name, avatar_text, avatar_image_url, bio, city, profile_style")
            .in("id", partnerIds)
        : Promise.resolve({ data: [] as ProfileRow[] }),
      supabaseAdmin
        .from("swipes")
        .select("user_id, movie_id, decision, created_at")
        .eq("user_id", currentUserId),
      partnerIds.length > 0
        ? supabaseAdmin
            .from("swipes")
            .select("user_id, movie_id, decision, created_at")
            .in("user_id", partnerIds)
            .eq("decision", "accepted")
        : Promise.resolve({ data: [] as SwipeRow[] }),
      sharedLinkIds.length > 0
        ? supabaseAdmin
            .from("shared_watchlist")
            .select("id, linked_user_id, movie_id, watched, updated_at")
            .in("linked_user_id", sharedLinkIds)
        : Promise.resolve({ data: [] as SharedWatchRow[] }),
    ]);

  const swipeRows = [
    ...(((ownSwipesResult.data ?? []) as SwipeRow[]) ?? []),
    ...(((partnerAcceptedSwipesResult.data ?? []) as SwipeRow[]) ?? []),
  ];
  const movieIds = Array.from(new Set(swipeRows.map((swipe) => swipe.movie_id)));

  const movieChunks = chunk(movieIds, 150);
  const movieResults = await Promise.all(
    movieChunks.map((ids) =>
      supabaseAdmin
        .from("movies")
        .select(
          "id, title, release_year, runtime, rating, genres, description, poster_eyebrow, poster_image_url, accent_from, accent_to, trailer_url",
        )
        .in("id", ids),
    ),
  );

  return NextResponse.json({
    profile: (profileResult.data ?? null) as ProfileRow | null,
    settings: settingsResult.data,
    links: linkRows,
    invites: (invitesResult.data ?? []) as InviteRow[],
    partnerProfiles: (partnerProfilesResult.data ?? []) as ProfileRow[],
    swipes: swipeRows,
    sharedWatch: (sharedWatchResult.data ?? []) as SharedWatchRow[],
    movies: movieResults.flatMap((result) => (result.data ?? []) as MovieRow[]),
  });
}

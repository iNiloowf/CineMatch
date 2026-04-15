import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/server/supabase-admin";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  avatar_text: string;
  avatar_image_url?: string | null;
  bio: string;
  city: string;
};

type SettingsRow = {
  user_id: string;
  dark_mode: boolean;
  notifications: boolean;
  autoplay_trailers: boolean;
  hide_spoilers: boolean;
  cellular_sync: boolean;
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

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }

  return output;
}

export async function GET(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization") ?? "";
  const accessToken = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7).trim()
    : "";

  if (!accessToken) {
    return NextResponse.json(
      { error: "You need to be logged in to sync account data." },
      { status: 401 },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Account sync is not configured on the server yet." },
      { status: 500 },
    );
  }

  const userResult = await supabaseAdmin.auth.getUser(accessToken);
  const currentUserId = userResult.data.user?.id;

  if (userResult.error || !currentUserId) {
    return NextResponse.json(
      { error: "Your login session could not be verified." },
      { status: 401 },
    );
  }

  const [profileResult, settingsResult, linksResult, invitesResult] =
    await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, avatar_text, avatar_image_url, bio, city")
        .eq("id", currentUserId)
        .maybeSingle(),
      supabaseAdmin
        .from("settings")
        .select(
          "user_id, dark_mode, notifications, autoplay_trailers, hide_spoilers, cellular_sync",
        )
        .eq("user_id", currentUserId)
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
            .select("id, email, full_name, avatar_text, avatar_image_url, bio, city")
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
    settings: (settingsResult.data ?? null) as SettingsRow | null,
    links: linkRows,
    invites: (invitesResult.data ?? []) as InviteRow[],
    partnerProfiles: (partnerProfilesResult.data ?? []) as ProfileRow[],
    swipes: swipeRows,
    sharedWatch: (sharedWatchResult.data ?? []) as SharedWatchRow[],
    movies: movieResults.flatMap((result) => (result.data ?? []) as MovieRow[]),
  });
}

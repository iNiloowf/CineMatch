import { chunkItems } from "@/lib/account-sync/chunk-items";
import { fetchSettingsRowForSync } from "@/lib/account-sync/settings-fetch";
import type {
  AccountSyncPayload,
  InviteRow,
  LinkRow,
  MovieRow,
  ProfileRow,
  SharedWatchRow,
  SwipeRow,
} from "@/lib/account-sync/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseBrowserClient>>;

/**
 * Loads account data directly from Supabase in the browser (chunked movie fetch).
 * Used when hydrating / refreshing local app state for the signed-in user.
 */
export async function fetchAccountSyncFromBrowser(
  supabaseClient: SupabaseClient,
  activeUserId: string,
): Promise<AccountSyncPayload | null> {
  const profileResult = await supabaseClient
    .from("profiles")
    .select("id, email, full_name, avatar_text, avatar_image_url, bio, city, profile_style, favorite_movie_id, favorite_movie_title, favorite_movie_year, favorite_movie_poster_url, favorite_movie_media_type")
    .eq("id", activeUserId)
    .maybeSingle();

  if (profileResult.error) {
    return null;
  }

  const [settingsResult, linksResult, invitesResult] = await Promise.all([
    fetchSettingsRowForSync(supabaseClient, activeUserId),
    supabaseClient
      .from("linked_users")
      .select("id, requester_id, target_id, status, created_at")
      .or(`requester_id.eq.${activeUserId},target_id.eq.${activeUserId}`),
    supabaseClient
      .from("invite_links")
      .select("id, inviter_id, token, created_at, used_at")
      .eq("inviter_id", activeUserId)
      .order("created_at", { ascending: false }),
  ]);

  if (settingsResult.error || linksResult.error || invitesResult.error) {
    return null;
  }

  const linkRows = ((linksResult.data ?? []) as LinkRow[]) ?? [];
  const partnerIds = Array.from(
    new Set(
      linkRows.map((link) =>
        link.requester_id === activeUserId ? link.target_id : link.requester_id,
      ),
    ),
  );
  const sharedLinkIds = linkRows.map((link) => link.id);

  const partnerProfilesPromise =
    partnerIds.length > 0
      ? supabaseClient
          .from("profiles")
          .select("id, email, full_name, avatar_text, avatar_image_url, bio, city, profile_style, favorite_movie_id, favorite_movie_title, favorite_movie_year, favorite_movie_poster_url, favorite_movie_media_type")
          .in("id", partnerIds)
      : Promise.resolve({
          data: [] as ProfileRow[],
          error: null,
        });

  const ownSwipesPromise = supabaseClient
    .from("swipes")
    .select("user_id, movie_id, decision, created_at")
    .eq("user_id", activeUserId);

  const partnerAcceptedSwipesPromise =
    partnerIds.length > 0
      ? supabaseClient
          .from("swipes")
          .select("user_id, movie_id, decision, created_at")
          .in("user_id", partnerIds)
          .eq("decision", "accepted")
      : Promise.resolve({
          data: [] as SwipeRow[],
          error: null,
        });

  const sharedWatchPromise =
    sharedLinkIds.length > 0
      ? supabaseClient
          .from("shared_watchlist")
          .select("id, linked_user_id, movie_id, watched, updated_at")
          .in("linked_user_id", sharedLinkIds)
      : Promise.resolve({
          data: [] as SharedWatchRow[],
          error: null,
        });

  const [
    partnerProfilesResult,
    ownSwipesResult,
    partnerAcceptedSwipesResult,
    sharedWatchResult,
  ] = await Promise.all([
    partnerProfilesPromise,
    ownSwipesPromise,
    partnerAcceptedSwipesPromise,
    sharedWatchPromise,
  ]);

  if (
    partnerProfilesResult.error ||
    ownSwipesResult.error ||
    partnerAcceptedSwipesResult.error ||
    sharedWatchResult.error
  ) {
    return null;
  }

  const swipeRows = [
    ...(((ownSwipesResult.data ?? []) as SwipeRow[]) ?? []),
    ...(((partnerAcceptedSwipesResult.data ?? []) as SwipeRow[]) ?? []),
  ];
  const movieIds = Array.from(new Set(swipeRows.map((swipe) => swipe.movie_id)));
  const movieChunks = chunkItems(movieIds, 75);
  const movieResults = await Promise.all(
    movieChunks.map((ids) =>
      ids.length > 0
        ? supabaseClient
            .from("movies")
            .select(
              "id, title, release_year, runtime, rating, genres, description, poster_eyebrow, poster_image_url, accent_from, accent_to, trailer_url",
            )
            .in("id", ids)
        : Promise.resolve({
            data: [] as MovieRow[],
            error: null,
          }),
    ),
  );

  if (movieResults.some((result) => result.error)) {
    return null;
  }

  return {
    profile: (profileResult.data ?? null) as ProfileRow | null,
    settings: settingsResult.data ?? null,
    links: linkRows,
    invites: ((invitesResult.data ?? []) as InviteRow[]) ?? [],
    partnerProfiles: ((partnerProfilesResult.data ?? []) as ProfileRow[]) ?? [],
    swipes: swipeRows,
    sharedWatch: ((sharedWatchResult.data ?? []) as SharedWatchRow[]) ?? [],
    movies: movieResults.flatMap(
      (result) => ((result.data ?? []) as MovieRow[]) ?? [],
    ),
  };
}

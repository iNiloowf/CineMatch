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
  WatchedPickReviewRow,
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
  const profileSelect =
    "id, email, public_handle, full_name, avatar_text, avatar_image_url, bio, city, profile_style, favorite_movie_id, favorite_movie_title, favorite_movie_year, favorite_movie_poster_url, favorite_movie_media_type, profile_header_movie_id, profile_header_movie_title, profile_header_movie_year, profile_header_poster_url, profile_header_media_type";

  const profileResult = await supabaseClient
    .from("profiles")
    .select(profileSelect)
    .eq("id", activeUserId)
    .maybeSingle();

  if (profileResult.error) {
    return null;
  }

  const [settingsResult, linksResult] = await Promise.all([
    fetchSettingsRowForSync(supabaseClient, activeUserId),
    supabaseClient
      .from("linked_users")
      .select("id, requester_id, target_id, status, created_at")
      .or(`requester_id.eq.${activeUserId},target_id.eq.${activeUserId}`),
  ]);

  if (settingsResult.error || linksResult.error) {
    return null;
  }

  const linkRows = ((linksResult.data ?? []) as LinkRow[]) ?? [];
  const acceptedLinks = linkRows.filter((link) => link.status === "accepted");
  const acceptedPartnerIds = Array.from(
    new Set(
      acceptedLinks.map((link) =>
        link.requester_id === activeUserId ? link.target_id : link.requester_id,
      ),
    ),
  );
  const allLinkedProfileIds = Array.from(
    new Set(
      linkRows.map((link) =>
        link.requester_id === activeUserId ? link.target_id : link.requester_id,
      ),
    ),
  );
  const sharedLinkIds = acceptedLinks.map((link) => link.id);

  const partnerProfilesPromise =
    allLinkedProfileIds.length > 0
      ? supabaseClient
          .from("profiles")
          .select(profileSelect)
          .in("id", allLinkedProfileIds)
      : Promise.resolve({
          data: [] as ProfileRow[],
          error: null,
        });

  const ownSwipesPromise = supabaseClient
    .from("swipes")
    .select("user_id, movie_id, decision, created_at")
    .eq("user_id", activeUserId);

  const partnerAcceptedSwipesPromise =
    acceptedPartnerIds.length > 0
      ? supabaseClient
          .from("swipes")
          .select("user_id, movie_id, decision, created_at")
          .in("user_id", acceptedPartnerIds)
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

  const reviewUserIds = [activeUserId, ...acceptedPartnerIds];
  const watchedPickReviewsPromise = supabaseClient
    .from("watched_pick_reviews")
    .select("id, user_id, movie_id, recommended, watched_at")
    .in("user_id", reviewUserIds);

  const [
    partnerProfilesResult,
    ownSwipesResult,
    partnerAcceptedSwipesResult,
    sharedWatchResult,
    watchedPickReviewsResult,
  ] = await Promise.all([
    partnerProfilesPromise,
    ownSwipesPromise,
    partnerAcceptedSwipesPromise,
    sharedWatchPromise,
    watchedPickReviewsPromise,
  ]);

  if (
    partnerProfilesResult.error ||
    ownSwipesResult.error ||
    partnerAcceptedSwipesResult.error ||
    sharedWatchResult.error
  ) {
    return null;
  }

  const watchedPickReviewRows: WatchedPickReviewRow[] = watchedPickReviewsResult.error
    ? []
    : (((watchedPickReviewsResult.data ?? []) as WatchedPickReviewRow[]) ?? []);

  const swipeRows = [
    ...(((ownSwipesResult.data ?? []) as SwipeRow[]) ?? []),
    ...(((partnerAcceptedSwipesResult.data ?? []) as SwipeRow[]) ?? []),
  ];
  const movieIdSet = new Set(swipeRows.map((swipe) => swipe.movie_id));
  for (const row of watchedPickReviewRows) {
    movieIdSet.add(row.movie_id);
  }
  const movieIds = Array.from(movieIdSet);
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
    invites: [] as InviteRow[],
    partnerProfiles: ((partnerProfilesResult.data ?? []) as ProfileRow[]) ?? [],
    swipes: swipeRows,
    sharedWatch: ((sharedWatchResult.data ?? []) as SharedWatchRow[]) ?? [],
    movies: movieResults.flatMap(
      (result) => ((result.data ?? []) as MovieRow[]) ?? [],
    ),
    watchedPickReviews: watchedPickReviewRows,
  };
}

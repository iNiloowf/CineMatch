/** TMDB poster CDN — pick width by surface so lists do not pull full w500 tiles. */

const TMDB_HOST = "image.tmdb.org";

export type PosterDisplayProfile = "hero" | "list" | "search";

const PROFILE_TO_SIZE: Record<PosterDisplayProfile, string> = {
  hero: "w780",
  list: "w342",
  search: "w185",
};

export function resolvePosterUrl(
  imageUrl: string | undefined,
  profile: PosterDisplayProfile,
): string | undefined {
  if (!imageUrl) {
    return undefined;
  }

  if (!imageUrl.includes(TMDB_HOST)) {
    return imageUrl;
  }

  const nextSize = PROFILE_TO_SIZE[profile];
  return imageUrl.replace(/\/t\/p\/w\d+\//, `/t/p/${nextSize}/`);
}

export function posterSizesAttr(profile: PosterDisplayProfile): string {
  switch (profile) {
    case "hero":
      return "(max-width: 480px) 100vw, 420px";
    case "list":
      return "120px";
    case "search":
      return "72px";
    default:
      return "100vw";
  }
}

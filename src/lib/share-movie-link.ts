/**
 * Share or copy a deep link to Discover for a movie. Returns a user-facing message.
 */
export async function shareMovieDeepLink(movieId: string, displayTitle?: string): Promise<string> {
  if (typeof window === "undefined") {
    return "Sharing isn’t available here.";
  }

  const shareUrl = `${window.location.origin}/discover?movieId=${encodeURIComponent(movieId)}`;
  const label = displayTitle?.trim() || "this title";

  try {
    if (navigator.share) {
      await navigator.share({
        title: `${label} · CineMatch`,
        text: `Open in CineMatch to swipe on “${label}”.`,
        url: shareUrl,
      });
      return "Shared.";
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      return "Link copied — paste it anywhere.";
    }

    window.prompt("Copy this movie link", shareUrl);
    return "Copy the link from the dialog.";
  } catch {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        return "Link copied — paste it anywhere.";
      } catch {
        return "Couldn’t share or copy. Try again.";
      }
    }
    return "Couldn’t share or copy. Try again.";
  }
}

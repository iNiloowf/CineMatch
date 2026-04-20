/**
 * Apply the user's trailer autoplay preference to embed URLs (YouTube, etc.).
 * Browsers often block unmuted autoplay; when autoplay is on we set mute=1 so playback can start (user can unmute in the player).
 */
export function applyTrailerAutoplayPreference(
  url: string | null,
  autoplayPreferred: boolean,
): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
      parsed.searchParams.set("autoplay", autoplayPreferred ? "1" : "0");
      if (autoplayPreferred) {
        parsed.searchParams.set("mute", "1");
      } else {
        parsed.searchParams.delete("mute");
      }
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

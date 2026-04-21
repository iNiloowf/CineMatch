/** Max linked friend relationships (accepted + pending) per account in the UI and API. */
export const MAX_LINKED_FRIENDS = 30;

/**
 * Invite blurb for share / copy. The invite URL is always alone on the last line
 * (no trailing text) so clients can linkify it reliably.
 */
export function buildInviteShareMessage(inviteUrl: string, senderName?: string | null) {
  const cleanUrl = inviteUrl.trim();
  const name = senderName?.trim();
  const head = name
    ? [
        "CineMatch — match movies & shows with friends.",
        `From: ${name}`,
        "Open this link in the app to connect our accounts:",
      ]
    : [
        "CineMatch — match movies & shows with friends.",
        "Open this link in the app to connect:",
      ];
  return `${head.join("\n")}\n\n${cleanUrl}`;
}

export async function shareOrCopyInviteMessage(
  inviteUrl: string,
  senderName?: string | null,
): Promise<{ ok: boolean; message: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Sharing isn’t available here." };
  }

  const text = buildInviteShareMessage(inviteUrl, senderName);

  try {
    if (navigator.share) {
      // Omit `url` — combining `text` + `url` duplicates or splits the link on many platforms.
      await navigator.share({
        title: "CineMatch invite",
        text,
      });
      return { ok: true, message: "Ready to send." };
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, message: "" };
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { ok: true, message: "Message copied — link is on the last line." };
    }
  } catch {
    return { ok: false, message: "Couldn’t copy. Try again." };
  }

  return { ok: false, message: "Couldn’t share or copy. Try again." };
}

export function parseInviteTokenFromPaste(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^invite-[0-9a-f-]{10,}$/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const invite = url.searchParams.get("invite")?.trim();
    if (invite) {
      return invite;
    }
  } catch {
    // try line-by-line or embedded token
  }

  for (const line of trimmed.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.includes("http")) {
      continue;
    }
    try {
      const url = new URL(t);
      const invite = url.searchParams.get("invite")?.trim();
      if (invite) {
        return invite;
      }
    } catch {
      // next line
    }
  }

  const embedded = trimmed.match(/invite-[0-9a-f-]{10,}/i);
  if (embedded) {
    return embedded[0];
  }

  if (!trimmed.includes("http") && trimmed.startsWith("invite-")) {
    return trimmed;
  }

  return "";
}

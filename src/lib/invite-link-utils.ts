/** Max linked friend relationships (accepted + pending) per account in the UI and API. */
export const MAX_LINKED_FRIENDS = 30;

/**
 * Line users can put before the URL when sharing an invite (copy / system share sheet).
 */
export function buildInviteShareMessage(inviteUrl: string, senderName?: string | null) {
  const name = senderName?.trim();
  const intro = name
    ? `Hi! It’s ${name}. Add me on CineMatch — open this link to connect our accounts:`
    : `Hi! Add me on CineMatch — open this link to connect our accounts:`;
  return `${intro}\n\n${inviteUrl}`;
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
      await navigator.share({
        title: "CineMatch invite",
        text,
        url: inviteUrl,
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
      return { ok: true, message: "Message copied — paste it in your chat, then send." };
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

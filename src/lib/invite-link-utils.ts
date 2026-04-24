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

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through
    }
  }
  if (typeof document === "undefined") {
    return false;
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Tries the Clipboard API, then a hidden textarea + execCommand (WebView / some browsers).
 * Optionally falls back to copying the raw URL (short) if the full message fails.
 */
async function tryCopyInvite(
  text: string,
  fallbackUrl: string,
): Promise<{ ok: boolean; message: string }> {
  if (await copyTextToClipboard(text)) {
    return { ok: true, message: "Message copied — link is on the last line." };
  }
  if (fallbackUrl && fallbackUrl !== text) {
    if (await copyTextToClipboard(fallbackUrl)) {
      return { ok: true, message: "Link copied. Paste and send it to your friend." };
    }
  }
  return { ok: false, message: "Couldn’t copy. Try again or long-press the link below to copy it." };
}

export type ShareOrCopyInviteOptions = {
  /** "Copy" buttons: copy to clipboard; skip the system share sheet first. */
  preferCopy?: boolean;
};

export async function shareOrCopyInviteMessage(
  inviteUrl: string,
  senderName?: string | null,
  options?: ShareOrCopyInviteOptions,
): Promise<{ ok: boolean; message: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Sharing isn’t available here." };
  }

  const cleanUrl = inviteUrl.trim();
  const text = buildInviteShareMessage(cleanUrl, senderName);

  if (options?.preferCopy) {
    return tryCopyInvite(text, cleanUrl);
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: "CineMatch invite",
        text,
      });
      return { ok: true, message: "Ready to send." };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Dismissed share sheet — most users want clipboard next.
        return tryCopyInvite(text, cleanUrl);
      }
      return tryCopyInvite(text, cleanUrl);
    }
  }

  return tryCopyInvite(text, cleanUrl);
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

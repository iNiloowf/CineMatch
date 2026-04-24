/** Max linked friend relationships (accepted + pending) per account in the UI and API. */
export const MAX_LINKED_FRIENDS = 30;

/** LTR / bidi: keeps full https://…/path?… one tappable link in RTL chats. */
const LTR_MARK = "\u200E";

/**
 * Lines above the link are peppy (with emoji); the URL is always a single unbroken
 * `https://...` on the last line with a leading LTR mark so apps (esp. RTL chats)
 * link the full path+query, not a broken "domain only" span.
 * Avoid fancy Unicode dashes in the body: they can confuse bidi in some clients.
 */
export function buildInviteShareMessage(inviteUrl: string, senderName?: string | null) {
  const cleanUrl = inviteUrl.trim();
  if (!cleanUrl) {
    return "";
  }
  const name = senderName?.trim();
  const head = name
    ? [
        "CineMatch - match movies & shows with friends! 🍿",
        `👤 From: ${name}`,
        "Open this in the CineMatch app to connect: ✨",
      ]
    : [
        "CineMatch - match movies & shows with friends! 🍿",
        "Open this in the CineMatch app to connect: ✨",
      ];
  return `${head.join("\n")}\n\n${LTR_MARK}${cleanUrl}`;
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
    return { ok: true, message: "Copied! Share the last line in chat to connect." };
  }
  if (fallbackUrl && fallbackUrl !== text) {
    const fb = /^https?:/i.test(fallbackUrl) ? `${LTR_MARK}${fallbackUrl.trim()}` : fallbackUrl.trim();
    if (await copyTextToClipboard(fb)) {
      return { ok: true, message: "Link only copied (use Paste link in the app to connect)." };
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
    // Full message (emoji + blurb) + tappable LTR line for URL; not URL-only.
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

/** Strip invisible bidi/embedding marks that we add for copy/paste; keeps URL/invite parsing. */
const stripBidiClutter = (s: string) => s.replace(/[\u200E\u200F\u200B\uFEFF\u2066-\u2069\u202A-\u202E]/g, "").trim();

/** E.g. …/c/a1b2c3d4e5 in our short invite URLs (redirects to /connect?invite=…). */
const SHORT_C_PATH = /\/c\/([a-z0-9]{6,20})(?:[/?#]|\s|$)/i;

export function extractShortInviteCodeFromPaste(value: string) {
  const t = stripBidiClutter(value);
  const m = t.match(SHORT_C_PATH);
  return m ? m[1]!.toLowerCase() : "";
}

/**
 * Full token (invite-…), from a long /connect?invite= URL, raw token, or a short /c/… code (async lookup).
 */
export async function resolvePastedInviteToToken(value: string): Promise<string> {
  const fromSync = parseInviteTokenFromPaste(value);
  if (fromSync) {
    return fromSync;
  }
  const code = extractShortInviteCodeFromPaste(value);
  if (!code) {
    return "";
  }
  try {
    const res = await fetch(
      `/api/invite/resolve?code=${encodeURIComponent(code)}`,
      { method: "GET" },
    );
    const j = (await res.json()) as { token?: string; error?: string };
    if (res.ok && typeof j.token === "string" && j.token.startsWith("invite-")) {
      return j.token;
    }
  } catch {
    // offline / blocked
  }
  return "";
}

export function parseInviteTokenFromPaste(value: string) {
  const trimmed = stripBidiClutter(value);

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
    const t = stripBidiClutter(line);
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

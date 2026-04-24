/**
 * Shorter, cleaner origin for share/copied links (e.g. https://cinematch.ca/...).
 * Strips a leading `www.` so Telegram/others are less likely to only underline the
 * first line and leave `/c/...` on the next line as plain text.
 */
export function publicAppOriginForInviteLinks(href: string) {
  return href.replace(/\/$/, "").replace(/^(https?:\/\/)www\./i, "$1");
}

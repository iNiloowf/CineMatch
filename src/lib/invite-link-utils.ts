/** Max linked friend relationships (accepted + pending) per account in the UI. */
export const MAX_LINKED_FRIENDS = 3;

export function parseInviteTokenFromPaste(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (!trimmed.includes("http")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    return url.searchParams.get("invite") ?? "";
  } catch {
    return "";
  }
}

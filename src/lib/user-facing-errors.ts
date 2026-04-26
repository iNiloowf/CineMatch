/**
 * Human-readable copy for common client-side failure modes (offline, timeouts, 5xx).
 * Keep messages short; prefer action (“check your connection”, “try again”) over stack traces.
 */

const OFFLINE = "You appear to be offline. Check Wi-Fi or mobile data, then try again.";

const GENERIC = "Something went wrong. Check your connection and try again.";

const SLOW_OR_TIMEOUT =
  "The server is taking too long to respond. Check your connection or try again in a moment.";

/**
 * `navigator.onLine` is a hint only (e.g. captive portals still report "online").
 * Use for better copy when a fetch throws (often `TypeError: Failed to fetch`).
 */
export function getUserMessageForFailedFetch(isOnline: boolean): string {
  if (!isOnline) {
    return OFFLINE;
  }
  return GENERIC;
}

/**
 * For failed search/list requests where we have an HTTP response.
 */
export function getUserMessageForSearchFailure(
  isOnline: boolean,
  status: number,
  serverMessage?: string,
): string {
  if (status === 0 || !isOnline) {
    return OFFLINE;
  }
  if (serverMessage && serverMessage.length > 0 && serverMessage.length < 200) {
    return serverMessage;
  }
  if (status >= 500) {
    return SLOW_OR_TIMEOUT;
  }
  if (status === 401 || status === 403) {
    return "This action needs a valid sign-in. Open Settings or sign in again, then try again.";
  }
  if (status === 429) {
    return "Too many requests. Wait a moment, then try again.";
  }
  return "We couldn’t complete that. Try again in a moment.";
}

import { bottomTabNavItems } from "@/lib/bottom-tab-nav";

export type HardwareBackDecision = "closed" | "back" | "leave";

const TAB_ROOTS = new Set<string>(bottomTabNavItems.map((item) => item.href));

/** Nested or alias routes that should fall back to a known parent when WebView history is empty. */
const PARENT_ALIASES: Record<string, string> = {
  "/discover1": "/discover",
  "/discover2": "/discover",
  "/connect": "/friends",
  "/linked": "/friends",
  "/auth/check-email": "/signup",
  "/auth/email-confirmed": "/discover",
  "/auth/callback": "/",
  "/account-deletion": "/settings",
  "/admin": "/settings",
};

export function normalizePathname(pathname: string): string {
  const noHash = pathname.split("#")[0] ?? "";
  const noQuery = noHash.split("?")[0] ?? "";
  const trimmed = noQuery.replace(/\/+$/u, "");
  return trimmed === "" ? "/" : trimmed;
}

export function parentPathForHardwareBack(pathname: string): string | null {
  const path = normalizePathname(pathname);
  const aliased = PARENT_ALIASES[path];
  if (aliased) {
    return aliased;
  }
  if (path === "/" || TAB_ROOTS.has(path)) {
    return null;
  }
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) {
    return null;
  }
  segments.pop();
  if (segments.length === 0) {
    return "/";
  }
  const parent = `/${segments.join("/")}`;
  if (parent === "/auth") {
    return "/";
  }
  return parent;
}

export function handleHardwareBackPress(options: {
  canGoBack: boolean;
  pathname: string;
  closeOverlay: () => boolean;
  goBack: () => void;
  goToParent: (parent: string) => void;
}): HardwareBackDecision {
  if (options.closeOverlay()) {
    return "closed";
  }
  if (options.canGoBack) {
    options.goBack();
    return "back";
  }
  const parent = parentPathForHardwareBack(options.pathname);
  if (parent && parent !== normalizePathname(options.pathname)) {
    options.goToParent(parent);
    return "back";
  }
  return "leave";
}

export const bottomTabNavItems = [
  { href: "/discover", label: "Discover" },
  { href: "/picks", label: "Picks" },
  { href: "/shared", label: "Shared" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
] as const;

/** Connect lives outside the 5 tabs; highlight Profile while finishing an invite there. */
export const CONNECT_AS_PROFILE_TAB = /^\/connect(\/|$)/;

export function resolveBottomNavHighlight(pathname: string) {
  const items = bottomTabNavItems;
  const exactIndex = items.findIndex((item) => item.href === pathname);
  if (exactIndex >= 0) {
    return {
      pillIndex: exactIndex,
      activeHref: items[exactIndex].href,
    };
  }
  if (pathname.startsWith("/settings")) {
    const settingsIndex = items.findIndex((item) => item.href === "/settings");
    if (settingsIndex >= 0) {
      return { pillIndex: settingsIndex, activeHref: "/settings" };
    }
  }
  if (CONNECT_AS_PROFILE_TAB.test(pathname)) {
    const profileIndex = items.findIndex((item) => item.href === "/profile");
    if (profileIndex >= 0) {
      return { pillIndex: profileIndex, activeHref: "/profile" };
    }
  }
  if (pathname === "/discover1" || pathname === "/discover2") {
    const discoverIndex = items.findIndex((item) => item.href === "/discover");
    if (discoverIndex >= 0) {
      return { pillIndex: discoverIndex, activeHref: "/discover" };
    }
  }
  return { pillIndex: -1, activeHref: null as string | null };
}

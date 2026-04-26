export const bottomTabNavItems = [
  { href: "/discover", label: "Discover" },
  { href: "/picks", label: "Picks" },
  { href: "/shared", label: "Shared" },
  { href: "/friends", label: "Friends" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
] as const;

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
  if (pathname === "/discover1" || pathname === "/discover2") {
    const discoverIndex = items.findIndex((item) => item.href === "/discover");
    if (discoverIndex >= 0) {
      return { pillIndex: discoverIndex, activeHref: "/discover" };
    }
  }
  if (pathname === "/connect" || pathname.startsWith("/connect/") || pathname === "/linked") {
    const friendsIndex = items.findIndex((item) => item.href === "/friends");
    if (friendsIndex >= 0) {
      return { pillIndex: friendsIndex, activeHref: "/friends" };
    }
  }
  return { pillIndex: -1, activeHref: null as string | null };
}

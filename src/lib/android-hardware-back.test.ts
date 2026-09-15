import { describe, expect, it, vi } from "vitest";
import {
  handleHardwareBackPress,
  normalizePathname,
  parentPathForHardwareBack,
} from "@/lib/android-hardware-back";

describe("normalizePathname", () => {
  it("strips query, hash, and trailing slashes", () => {
    expect(normalizePathname("/friends/abc/?tab=x#top")).toBe("/friends/abc");
  });

  it("treats empty as root", () => {
    expect(normalizePathname("")).toBe("/");
    expect(normalizePathname("/")).toBe("/");
  });
});

describe("parentPathForHardwareBack", () => {
  it("returns null on tab roots so the app can background instead of leaving the tab", () => {
    expect(parentPathForHardwareBack("/discover")).toBeNull();
    expect(parentPathForHardwareBack("/picks")).toBeNull();
    expect(parentPathForHardwareBack("/settings")).toBeNull();
    expect(parentPathForHardwareBack("/")).toBeNull();
  });

  it("walks nested app routes up one segment", () => {
    expect(parentPathForHardwareBack("/friends/user-1")).toBe("/friends");
    expect(parentPathForHardwareBack("/settings/tickets")).toBe("/settings");
  });

  it("maps known aliases", () => {
    expect(parentPathForHardwareBack("/discover1")).toBe("/discover");
    expect(parentPathForHardwareBack("/connect")).toBe("/friends");
    expect(parentPathForHardwareBack("/auth/check-email")).toBe("/signup");
  });
});

describe("handleHardwareBackPress", () => {
  it("closes an overlay before navigating", () => {
    const goBack = vi.fn();
    const goToParent = vi.fn();
    const decision = handleHardwareBackPress({
      canGoBack: true,
      pathname: "/friends/user-1",
      closeOverlay: () => true,
      goBack,
      goToParent,
    });
    expect(decision).toBe("closed");
    expect(goBack).not.toHaveBeenCalled();
    expect(goToParent).not.toHaveBeenCalled();
  });

  it("uses in-app history when the stack can go back", () => {
    const goBack = vi.fn();
    const decision = handleHardwareBackPress({
      canGoBack: true,
      pathname: "/picks",
      closeOverlay: () => false,
      goBack,
      goToParent: vi.fn(),
    });
    expect(decision).toBe("back");
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it("falls back to the parent route when history is empty", () => {
    const goToParent = vi.fn();
    const decision = handleHardwareBackPress({
      canGoBack: false,
      pathname: "/friends/user-1",
      closeOverlay: () => false,
      goBack: vi.fn(),
      goToParent,
    });
    expect(decision).toBe("back");
    expect(goToParent).toHaveBeenCalledWith("/friends");
  });

  it("leaves the app on a tab root with no history", () => {
    const decision = handleHardwareBackPress({
      canGoBack: false,
      pathname: "/discover",
      closeOverlay: () => false,
      goBack: vi.fn(),
      goToParent: vi.fn(),
    });
    expect(decision).toBe("leave");
  });
});

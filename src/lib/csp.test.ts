import { describe, expect, it, vi } from "vitest";
import { getContentSecurityPolicy } from "./csp";

describe("getContentSecurityPolicy", () => {
  it("uses nonce-based script-src when a nonce is provided", () => {
    const csp = getContentSecurityPolicy({ isProduction: true, nonce: "abc123" });
    const scriptPart = csp
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith("script-src"));
    expect(scriptPart).toBeDefined();
    expect(scriptPart).toContain("'self'");
    expect(scriptPart).toContain("'nonce-abc123'");
    expect(scriptPart).not.toContain("unsafe-inline");
    expect(scriptPart).not.toContain("unsafe-eval");
  });

  it("falls back to self-only script-src when nonce is missing", () => {
    const csp = getContentSecurityPolicy({ isProduction: true });
    const scriptPart = csp
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith("script-src"));
    expect(scriptPart).toBeDefined();
    expect(scriptPart).toBe("script-src 'self'");
  });

  it("includes Sentry connect host when DSN is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://abc@o12345.ingest.sentry.io/1");
    const csp = getContentSecurityPolicy({ isProduction: true });
    expect(csp).toContain("https://o12345.ingest.sentry.io");
    vi.unstubAllEnvs();
  });
});

import { describe, expect, it, vi } from "vitest";
import { getContentSecurityPolicy } from "./csp";

describe("getContentSecurityPolicy", () => {
  it("omits script unsafe-inline in production mode (styles may still use it)", () => {
    const csp = getContentSecurityPolicy({ isProduction: true });
    const scriptPart = csp
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith("script-src"));
    expect(scriptPart).toBeDefined();
    expect(scriptPart).toContain("'self'");
    expect(scriptPart).not.toContain("unsafe-inline");
  });

  it("allows eval in development mode for the Next dev server", () => {
    const csp = getContentSecurityPolicy({ isProduction: false });
    expect(csp).toMatch(/'unsafe-eval'/u);
  });

  it("includes Sentry connect host when DSN is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://abc@o12345.ingest.sentry.io/1");
    const csp = getContentSecurityPolicy({ isProduction: true });
    expect(csp).toContain("https://o12345.ingest.sentry.io");
    vi.unstubAllEnvs();
  });
});

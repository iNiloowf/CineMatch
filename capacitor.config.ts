import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Remote WebView: loads the same Next app as the browser, so the deployment’s
 * `Content-Security-Policy` (see `next.config.ts` + `src/lib/csp.ts` + docs/content-security-policy.md)
 * applies. Add `CSP_CAPACITOR_EXTRA_SRCS` / `CSP_EXTRA_CONNECT_SRC` in `.env` for plugin-only
 * or staging hosts if a request is blocked in the WebView.
 */
const config: CapacitorConfig = {
  appId: "ca.cinematch.app",
  appName: "CineMatch",
  webDir: "public",
  server: {
    url: "https://cinematch.ca",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;

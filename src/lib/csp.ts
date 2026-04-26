/**
 * Build a strict Content-Security-Policy for the Next.js app (web) and
 * the Capacitor webview (loads the same site via `server.url` — same headers).
 *
 * Development: `script-src` includes `'unsafe-eval'` (Next.js / Turbopack HMR).
 * Production: scripts are only from `'self'` (e.g. `public/scripts/theme-boot.js`).
 * `style-src` includes `'unsafe-inline'` for React `style` props and layout paint.
 *
 * @see docs/content-security-policy.md
 */
export type CspBuildOptions = {
  /** @default process.env.NODE_ENV === "production" */
  isProduction?: boolean;
};

function wssForHost(host: string): string {
  return `wss://${host}`;
}

function supabaseCspFromUrl(
  raw: string | undefined,
): { connect: string[]; image: string[] } | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    const host = parsed.host;
    return {
      connect: [parsed.origin, wssForHost(host)],
      image: [parsed.origin],
    };
  } catch {
    return null;
  }
}

function parseSentryConnect(sentryDsn: string | undefined): string | null {
  if (!sentryDsn?.trim()) {
    return null;
  }
  try {
    const m = /^https?:\/\/[^@]+@([^/]+)/.exec(sentryDsn);
    if (m?.[1]) {
      return `https://${m[1]}`;
    }
    return new URL(sentryDsn).origin;
  } catch {
    return null;
  }
}

function splitExtra(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(/[,\s]+/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Returns a single `Content-Security-Policy` header value.
 */
export function getContentSecurityPolicy(
  options: CspBuildOptions = {},
): string {
  const isProd =
    options.isProduction !== undefined
      ? options.isProduction
      : process.env.NODE_ENV === "production";

  const supa = supabaseCspFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const sentryConnect = parseSentryConnect(
    process.env.NEXT_PUBLIC_SENTRY_DSN,
  );
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const extraConnect = splitExtra(process.env.CSP_EXTRA_CONNECT_SRC);
  const extraImage = splitExtra(process.env.CSP_EXTRA_IMG_SRC);
  const capExtra = splitExtra(process.env.CSP_CAPACITOR_EXTRA_SRCS);

  const connectParts = new Set<string>(["'self'"]);

  if (appUrl) {
    try {
      const a = new URL(appUrl);
      if (a.protocol === "https:" || a.protocol === "http:") {
        connectParts.add(a.origin);
        if (a.hostname === "localhost" || a.hostname === "127.0.0.1") {
          connectParts.add(`wss://${a.host}`);
        }
      }
    } catch {
      // ignore
    }
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && !vercelUrl.startsWith("http")) {
    connectParts.add(`https://${vercelUrl}`);
  }

  for (const h of supa?.connect ?? []) {
    connectParts.add(h);
  }
  if (sentryConnect) {
    connectParts.add(sentryConnect);
  }
  for (const c of extraConnect) {
    connectParts.add(c);
  }
  for (const c of capExtra) {
    connectParts.add(c);
  }

  if (!isProd) {
    connectParts.add("http://127.0.0.1:*");
    connectParts.add("http://localhost:*");
    connectParts.add("ws://127.0.0.1:*");
    connectParts.add("ws://localhost:*");
    connectParts.add("wss://127.0.0.1:*");
    connectParts.add("wss://localhost:*");
  }

  const connectSrc = Array.from(connectParts).join(" ");

  const imgParts = new Set<string>(["'self'", "data:", "blob:", "https://image.tmdb.org"]);
  for (const p of supa?.image ?? []) {
    imgParts.add(p);
  }
  for (const i of extraImage) {
    imgParts.add(i);
  }
  const imgSrc = Array.from(imgParts).join(" ");

  const styleSrc = "'self' 'unsafe-inline'";
  const scriptSrc = isProd ? "'self'" : "'self' 'unsafe-eval'";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "font-src 'self' data:",
    `img-src ${imgSrc}`,
    `connect-src ${connectSrc}`,
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
    "media-src 'self' blob: data:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    isProd ? "upgrade-insecure-requests" : null,
  ]
    .filter(Boolean)
    .join("; ");
}

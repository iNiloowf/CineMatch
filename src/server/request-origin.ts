import type { NextRequest } from "next/server";

function normalizeOrigin(value: string | null) {
  if (!value) {
    return null;
  }
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isTrustedBrowserOrigin(request: NextRequest) {
  const requestOrigin = normalizeOrigin(new URL(request.url).origin);
  const envAppOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL ?? null);
  const allowedOrigins = new Set<string>();
  if (requestOrigin) {
    allowedOrigins.add(requestOrigin);
  }
  if (envAppOrigin) {
    allowedOrigins.add(envAppOrigin);
  }

  const originHeader = normalizeOrigin(request.headers.get("origin"));
  if (originHeader && allowedOrigins.has(originHeader)) {
    return true;
  }

  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    try {
      const refererOrigin = new URL(refererHeader).origin;
      if (allowedOrigins.has(refererOrigin)) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

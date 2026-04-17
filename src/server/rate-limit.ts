import type { NextRequest } from "next/server";

type Bucket = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, Bucket>();

/**
 * Sliding-window counter (in-memory). Resets per server instance — use Redis/Upstash in production multi-instance.
 */
export function checkRateLimit(params: {
  key: string;
  max: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(params.key);

  if (!existing || now - existing.windowStart >= params.windowMs) {
    buckets.set(params.key, { count: 1, windowStart: now });
    return { ok: true };
  }

  if (existing.count >= params.max) {
    const retryAfterMs = params.windowMs - (now - existing.windowStart);
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true };
}

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

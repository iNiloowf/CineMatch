import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const HIDDEN_ADMIN_PATH =
  process.env.ADMIN_ENTRY_PATH ?? "/studio/portal-v9-a9k2m7r4xq";
const ADMIN_ENTRY_TOKEN_PARAM = "__admin_entry";
const ADMIN_ENTRY_TS_PARAM = "__admin_ts";
const ADMIN_ENTRY_SIG_PARAM = "__admin_sig";
const BLOCKED_ADMIN_FALLBACK_PATH = "/__blocked-admin-route__";
const ADMIN_ENTRY_TTL_MS = 60 * 1000;

function getProjectRef() {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

/** Propagate or mint `x-request-id` for API / log correlation. */
function withRequestId(request: NextRequest) {
  const id = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", id);
  return { id, requestHeaders };
}

function nextWithRequestId(request: NextRequest) {
  const { id, requestHeaders } = withRequestId(request);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", id);
  return response;
}

function rewriteWithRequestId(request: NextRequest, url: URL) {
  const { id, requestHeaders } = withRequestId(request);
  const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  response.headers.set("x-request-id", id);
  return response;
}

function toBase64Url(bytes: ArrayBuffer) {
  const raw = Array.from(new Uint8Array(bytes))
    .map((b) => String.fromCharCode(b))
    .join("");
  return btoa(raw)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function signAdminEntry(secret: string, ts: string) {
  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ts));
  return toBase64Url(signature);
}

async function hasValidAdminEntrySignature(request: NextRequest, secret: string) {
  if (request.nextUrl.searchParams.get(ADMIN_ENTRY_TOKEN_PARAM) !== "1") {
    return false;
  }
  const ts = request.nextUrl.searchParams.get(ADMIN_ENTRY_TS_PARAM);
  const sig = request.nextUrl.searchParams.get(ADMIN_ENTRY_SIG_PARAM);
  if (!ts || !sig) {
    return false;
  }
  const tsMs = Number.parseInt(ts, 10);
  if (!Number.isFinite(tsMs)) {
    return false;
  }
  if (Math.abs(Date.now() - tsMs) > ADMIN_ENTRY_TTL_MS) {
    return false;
  }
  const expected = await signAdminEntry(secret, ts);
  return sig === expected;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminEntrySecret = process.env.ADMIN_ENTRY_SECRET ?? "";

  if (pathname === HIDDEN_ADMIN_PATH || pathname === `${HIDDEN_ADMIN_PATH}/`) {
    if (!adminEntrySecret) {
      const blocked = request.nextUrl.clone();
      blocked.pathname = BLOCKED_ADMIN_FALLBACK_PATH;
      blocked.search = "";
      return rewriteWithRequestId(request, blocked);
    }
    const ts = String(Date.now());
    const sig = await signAdminEntry(adminEntrySecret, ts);
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/admin";
    rewriteUrl.searchParams.set(ADMIN_ENTRY_TOKEN_PARAM, "1");
    rewriteUrl.searchParams.set(ADMIN_ENTRY_TS_PARAM, ts);
    rewriteUrl.searchParams.set(ADMIN_ENTRY_SIG_PARAM, sig);
    return rewriteWithRequestId(request, rewriteUrl);
  }

  if (pathname === "/admin" || pathname === "/admin/") {
    const hasValidEntryToken = adminEntrySecret
      ? await hasValidAdminEntrySignature(request, adminEntrySecret)
      : false;

    if (!hasValidEntryToken) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = BLOCKED_ADMIN_FALLBACK_PATH;
      rewriteUrl.search = "";
      return rewriteWithRequestId(request, rewriteUrl);
    }
  }

  if (pathname.startsWith("/api/admin/")) {
    const auth = request.headers.get("authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const projectRef = getProjectRef();

  if (!projectRef) {
    return nextWithRequestId(request);
  }

  const staleCookieNames = request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith(`sb-${projectRef}-`));

  if (staleCookieNames.length === 0) {
    return nextWithRequestId(request);
  }

  const { id, requestHeaders } = withRequestId(request);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", id);
  const hostname = request.nextUrl.hostname;
  const hostParts = hostname.split(".");
  const rootDomain =
    hostParts.length >= 2 ? `.${hostParts.slice(-2).join(".")}` : undefined;

  for (const name of staleCookieNames) {
    response.cookies.set({
      name,
      value: "",
      maxAge: 0,
      path: "/",
    });

    response.cookies.set({
      name,
      value: "",
      maxAge: 0,
      path: "/",
      domain: hostname,
    });

    if (rootDomain) {
      response.cookies.set({
        name,
        value: "",
        maxAge: 0,
        path: "/",
        domain: rootDomain,
      });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

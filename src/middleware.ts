import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const HIDDEN_ADMIN_PATH =
  process.env.ADMIN_ENTRY_PATH ?? "/studio/portal-v9-a9k2m7r4xq";
const ADMIN_ENTRY_TOKEN_PARAM = "__admin_entry";
const BLOCKED_ADMIN_FALLBACK_PATH = "/__blocked-admin-route__";

function getProjectRef() {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === HIDDEN_ADMIN_PATH || pathname === `${HIDDEN_ADMIN_PATH}/`) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/admin";
    rewriteUrl.searchParams.set(ADMIN_ENTRY_TOKEN_PARAM, "1");
    return NextResponse.rewrite(rewriteUrl);
  }

  if (pathname === "/admin" || pathname === "/admin/") {
    const hasValidEntryToken =
      request.nextUrl.searchParams.get(ADMIN_ENTRY_TOKEN_PARAM) === "1";

    if (!hasValidEntryToken) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = BLOCKED_ADMIN_FALLBACK_PATH;
      rewriteUrl.search = "";
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  const projectRef = getProjectRef();

  if (!projectRef) {
    return NextResponse.next();
  }

  const staleCookieNames = request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith(`sb-${projectRef}-`));

  if (staleCookieNames.length === 0) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
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

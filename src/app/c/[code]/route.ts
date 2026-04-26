import { type NextRequest, NextResponse } from "next/server";

function appOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
}

type RouteContext = { params: Promise<{ code: string }> };

/**
 * Old short invite URLs pointed here. Invites are removed; send people to Friends + search.
 */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/friends", appOrigin(request)), 302);
}

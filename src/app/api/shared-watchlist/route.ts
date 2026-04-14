import { NextRequest, NextResponse } from "next/server";
import { getSharedWatchlist, updateSharedWatch } from "@/server/mock-db";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required." },
      { status: 400 },
    );
  }

  return NextResponse.json({ sharedWatchlist: getSharedWatchlist(userId) });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const shared = updateSharedWatch(body);
  return NextResponse.json({ shared });
}

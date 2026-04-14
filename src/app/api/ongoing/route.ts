import { NextRequest, NextResponse } from "next/server";
import { getSharedWatchlist } from "@/server/mock-db";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required." },
      { status: 400 },
    );
  }

  const ongoing = getSharedWatchlist(userId).filter(
    (entry) => entry.progress > 0 && entry.progress < 100 && !entry.watched,
  );

  return NextResponse.json({ ongoing });
}

import { NextRequest, NextResponse } from "next/server";
import { getSharedWatchlist, updateSharedWatch } from "@/server/mock-db";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";

export async function GET(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId || userId !== auth.userId) {
    return NextResponse.json(
      { error: "userId is required and must match your account." },
      { status: 400 },
    );
  }

  return NextResponse.json({ sharedWatchlist: getSharedWatchlist(userId) });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const body = (await request.json()) as { userId?: string };

  if (!body.userId || body.userId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const shared = updateSharedWatch(
    body as {
      userId: string;
      partnerId: string;
      movieId: string;
      watched?: boolean;
      progress?: number;
    },
  );
  return NextResponse.json({ shared });
}

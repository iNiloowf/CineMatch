import { NextRequest, NextResponse } from "next/server";
import { getDatabase, linkUsers } from "@/server/mock-db";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";

export async function GET(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get("userId");
  const database = getDatabase();

  if (userId && userId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const effectiveUserId = userId ?? auth.userId;

  return NextResponse.json({
    links: database.links.filter((link) => link.users.includes(effectiveUserId)),
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const body = (await request.json()) as { userId?: string; targetUserId?: string };

  if (!body.userId || body.userId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!body.targetUserId) {
    return NextResponse.json(
      { error: "targetUserId is required." },
      { status: 400 },
    );
  }

  const link = linkUsers(body.userId, body.targetUserId);
  return NextResponse.json({ link }, { status: 201 });
}

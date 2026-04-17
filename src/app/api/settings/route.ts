import { NextRequest, NextResponse } from "next/server";
import { getDatabase, updateSettings } from "@/server/mock-db";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";

export async function GET(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get("userId");
  const database = getDatabase();

  if (!userId || userId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!database.settings[userId]) {
    return NextResponse.json({ error: "Settings not found." }, { status: 404 });
  }

  return NextResponse.json({ settings: database.settings[userId] });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const body = (await request.json()) as { userId?: string } & Record<string, unknown>;

  if (!body.userId || body.userId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { userId: _userId, ...patch } = body;
  const settings = updateSettings(body.userId, patch);

  if (!settings) {
    return NextResponse.json({ error: "Settings not found." }, { status: 404 });
  }

  return NextResponse.json({ settings });
}

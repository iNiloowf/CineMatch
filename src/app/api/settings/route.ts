import { NextRequest, NextResponse } from "next/server";
import { getDatabase, updateSettings } from "@/server/mock-db";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const database = getDatabase();

  if (!userId || !database.settings[userId]) {
    return NextResponse.json({ error: "Settings not found." }, { status: 404 });
  }

  return NextResponse.json({ settings: database.settings[userId] });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const settings = updateSettings(body.userId, body);

  if (!settings) {
    return NextResponse.json({ error: "Settings not found." }, { status: 404 });
  }

  return NextResponse.json({ settings });
}

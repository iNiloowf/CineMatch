import { NextRequest, NextResponse } from "next/server";
import { getDatabase, updateProfile } from "@/server/mock-db";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const database = getDatabase();
  const user = database.users.find((entry) => entry.id === userId);

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const safeUser = { ...user };
  Reflect.deleteProperty(safeUser, "password");
  return NextResponse.json({ profile: safeUser });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const user = updateProfile(body.userId, body);

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ profile: user });
}

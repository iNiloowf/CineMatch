import { NextRequest, NextResponse } from "next/server";
import { getDatabase, linkUsers } from "@/server/mock-db";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const database = getDatabase();

  if (!userId) {
    return NextResponse.json({ links: database.links });
  }

  return NextResponse.json({
    links: database.links.filter((link) => link.users.includes(userId)),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const link = linkUsers(body.userId, body.targetUserId);
  return NextResponse.json({ link }, { status: 201 });
}

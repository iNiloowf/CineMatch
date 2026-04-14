import { NextRequest, NextResponse } from "next/server";
import { saveSwipe } from "@/server/mock-db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const swipe = saveSwipe(body.userId, body.movieId, body.decision);
  return NextResponse.json({ swipe }, { status: 201 });
}

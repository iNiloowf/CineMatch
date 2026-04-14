import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/server/mock-db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const user = loginUser(body.email, body.password);

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  return NextResponse.json({ user });
}

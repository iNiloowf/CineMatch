import { NextRequest, NextResponse } from "next/server";
import { signupUser } from "@/server/mock-db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = signupUser(body);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json(result, { status: 201 });
}

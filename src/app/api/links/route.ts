import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody } from "@/server/api-validation";
import { getDatabase, linkUsers } from "@/server/mock-db";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { z } from "zod";

const createLinkBodySchema = z.object({
  userId: z.string().min(1),
  targetUserId: z.string().min(1),
});

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

  const parsedBody = await parseJsonBody(request, createLinkBodySchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;

  if (!body.userId || body.userId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const link = linkUsers(body.userId, body.targetUserId);
  return NextResponse.json({ link }, { status: 201 });
}

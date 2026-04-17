import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody } from "@/server/api-validation";
import { getSharedWatchlist, updateSharedWatch } from "@/server/mock-db";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { z } from "zod";

const sharedWatchlistPatchSchema = z.object({
  userId: z.string().min(1),
  partnerId: z.string().min(1),
  movieId: z.string().min(1),
  watched: z.boolean().optional(),
  progress: z.number().optional(),
});

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

  const parsedBody = await parseJsonBody(request, sharedWatchlistPatchSchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;

  if (!body.userId || body.userId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const shared = updateSharedWatch(body);
  return NextResponse.json({ shared });
}

import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody } from "@/server/api-validation";
import { getDatabase, updateSettings } from "@/server/mock-db";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { z } from "zod";

const settingsPatchSchema = z
  .object({
    userId: z.string().min(1),
  })
  .catchall(z.unknown());

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

  const parsedBody = await parseJsonBody(request, settingsPatchSchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;

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

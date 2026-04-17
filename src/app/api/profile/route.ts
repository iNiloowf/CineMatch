import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody } from "@/server/api-validation";
import { getDatabase, updateProfile } from "@/server/mock-db";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { z } from "zod";

const profilePatchSchema = z.object({
  userId: z.string().min(1),
  bio: z.string().optional(),
  city: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId || userId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

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
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request, profilePatchSchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;

  if (!body.userId || body.userId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const user = updateProfile(body.userId, { bio: body.bio, city: body.city });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ profile: user });
}

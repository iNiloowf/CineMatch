import { NextRequest, NextResponse } from "next/server";
import { API_ERROR_CODES, apiJsonError } from "@/server/api-response";
import { parseJsonBody, parseSearchParams } from "@/server/api-validation";
import { getDatabase, updateProfile } from "@/server/mock-db";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { z } from "zod";

const profileGetQuerySchema = z.object({
  userId: z.string().min(1),
});

const profilePatchSchema = z.object({
  userId: z.string().min(1),
  bio: z.string().optional(),
  city: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return apiJsonError(401, "You need to be logged in.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
    });
  }

  const parsedQuery = parseSearchParams(request, profileGetQuerySchema);
  if (!parsedQuery.ok) {
    return parsedQuery.response;
  }
  const userId = parsedQuery.data.userId;

  if (userId !== auth.userId) {
    return apiJsonError(403, "Forbidden.", { code: API_ERROR_CODES.FORBIDDEN });
  }

  const database = getDatabase();
  const user = database.users.find((entry) => entry.id === userId);

  if (!user) {
    return apiJsonError(404, "User not found.", { code: API_ERROR_CODES.NOT_FOUND });
  }

  const safeUser = { ...user };
  Reflect.deleteProperty(safeUser, "password");
  return NextResponse.json({ profile: safeUser });
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return apiJsonError(401, "You need to be logged in.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
    });
  }

  const parsedBody = await parseJsonBody(request, profilePatchSchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;

  if (!body.userId || body.userId !== auth.userId) {
    return apiJsonError(403, "Forbidden.", { code: API_ERROR_CODES.FORBIDDEN });
  }

  const user = updateProfile(body.userId, { bio: body.bio, city: body.city });

  if (!user) {
    return apiJsonError(404, "User not found.", { code: API_ERROR_CODES.NOT_FOUND });
  }

  return NextResponse.json({ profile: user });
}

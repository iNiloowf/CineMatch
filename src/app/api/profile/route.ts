import { NextRequest } from "next/server";
import { forbiddenUserScopeResponse, requireAuthenticatedUser } from "@/server/api-auth-guard";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { parseJsonBody, parseSearchParams } from "@/server/api-validation";
import { getDatabase, updateProfile } from "@/server/mock-db";
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
  const session = await requireAuthenticatedUser(request);
  if (!session.ok) {
    return session.response;
  }
  const { auth } = session;

  const parsedQuery = parseSearchParams(request, profileGetQuerySchema);
  if (!parsedQuery.ok) {
    return parsedQuery.response;
  }
  const userId = parsedQuery.data.userId;

  if (userId !== auth.userId) {
    return forbiddenUserScopeResponse(request);
  }

  const database = getDatabase();
  const user = database.users.find((entry) => entry.id === userId);

  if (!user) {
    return apiJsonError(404, "User not found.", {
      code: API_ERROR_CODES.NOT_FOUND,
      request,
    });
  }

  const safeUser = { ...user };
  Reflect.deleteProperty(safeUser, "password");
  return apiJsonOk({ profile: safeUser }, request);
}

export async function PATCH(request: NextRequest) {
  const session = await requireAuthenticatedUser(request);
  if (!session.ok) {
    return session.response;
  }
  const { auth } = session;

  const parsedBody = await parseJsonBody(request, profilePatchSchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;

  if (!body.userId || body.userId !== auth.userId) {
    return forbiddenUserScopeResponse(request);
  }

  const user = updateProfile(body.userId, { bio: body.bio, city: body.city });

  if (!user) {
    return apiJsonError(404, "User not found.", {
      code: API_ERROR_CODES.NOT_FOUND,
      request,
    });
  }

  return apiJsonOk({ profile: user }, request);
}

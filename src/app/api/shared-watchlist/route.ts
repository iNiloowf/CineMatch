import { NextRequest } from "next/server";
import { forbiddenUserScopeResponse, requireAuthenticatedUser } from "@/server/api-auth-guard";
import { apiJsonOk } from "@/server/api-response";
import { parseJsonBody, parseSearchParams } from "@/server/api-validation";
import { getSharedWatchlist, updateSharedWatch } from "@/server/mock-db";
import { z } from "zod";

const sharedWatchlistGetQuerySchema = z.object({
  userId: z.string().min(1, "userId is required and must match your account."),
});

const sharedWatchlistPatchSchema = z.object({
  userId: z.string().min(1),
  partnerId: z.string().min(1),
  movieId: z.string().min(1),
  watched: z.boolean().optional(),
  progress: z.number().optional(),
});

export async function GET(request: NextRequest) {
  const session = await requireAuthenticatedUser(request);
  if (!session.ok) {
    return session.response;
  }
  const { auth } = session;

  const parsedQuery = parseSearchParams(request, sharedWatchlistGetQuerySchema);
  if (!parsedQuery.ok) {
    return parsedQuery.response;
  }
  const userId = parsedQuery.data.userId;

  if (userId !== auth.userId) {
    return forbiddenUserScopeResponse(request);
  }

  return apiJsonOk({ sharedWatchlist: getSharedWatchlist(userId) }, request);
}

export async function PATCH(request: NextRequest) {
  const session = await requireAuthenticatedUser(request);
  if (!session.ok) {
    return session.response;
  }
  const { auth } = session;

  const parsedBody = await parseJsonBody(request, sharedWatchlistPatchSchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;

  if (!body.userId || body.userId !== auth.userId) {
    return forbiddenUserScopeResponse(request);
  }

  const shared = updateSharedWatch(body);
  return apiJsonOk({ shared }, request);
}

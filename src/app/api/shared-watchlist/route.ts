import { NextRequest } from "next/server";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { parseJsonBody, parseSearchParams } from "@/server/api-validation";
import { getSharedWatchlist, updateSharedWatch } from "@/server/mock-db";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
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
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return apiJsonError(401, "You need to be logged in.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
      request,
    });
  }

  const parsedQuery = parseSearchParams(request, sharedWatchlistGetQuerySchema);
  if (!parsedQuery.ok) {
    return parsedQuery.response;
  }
  const userId = parsedQuery.data.userId;

  if (userId !== auth.userId) {
    return apiJsonError(
      400,
      "userId is required and must match your account.",
      { code: API_ERROR_CODES.BAD_REQUEST, request },
    );
  }

  return apiJsonOk({ sharedWatchlist: getSharedWatchlist(userId) }, request);
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return apiJsonError(401, "You need to be logged in.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
      request,
    });
  }

  const parsedBody = await parseJsonBody(request, sharedWatchlistPatchSchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;

  if (!body.userId || body.userId !== auth.userId) {
    return apiJsonError(403, "Forbidden.", { code: API_ERROR_CODES.FORBIDDEN, request });
  }

  const shared = updateSharedWatch(body);
  return apiJsonOk({ shared }, request);
}

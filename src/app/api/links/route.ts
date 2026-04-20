import { NextRequest, NextResponse } from "next/server";
import { API_ERROR_CODES, apiJsonError } from "@/server/api-response";
import { parseJsonBody, parseSearchParams } from "@/server/api-validation";
import { getDatabase, linkUsers } from "@/server/mock-db";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { z } from "zod";

const linksGetQuerySchema = z.object({
  userId: z.string().optional(),
});

const createLinkBodySchema = z.object({
  userId: z.string().min(1),
  targetUserId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return apiJsonError(401, "You need to be logged in.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
    });
  }

  const parsedQuery = parseSearchParams(request, linksGetQuerySchema);
  if (!parsedQuery.ok) {
    return parsedQuery.response;
  }
  const userId = parsedQuery.data.userId;
  const database = getDatabase();

  if (userId && userId !== auth.userId) {
    return apiJsonError(403, "Forbidden.", { code: API_ERROR_CODES.FORBIDDEN });
  }

  const effectiveUserId = userId ?? auth.userId;

  return NextResponse.json({
    links: database.links.filter((link) => link.users.includes(effectiveUserId)),
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return apiJsonError(401, "You need to be logged in.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
    });
  }

  const parsedBody = await parseJsonBody(request, createLinkBodySchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;

  if (!body.userId || body.userId !== auth.userId) {
    return apiJsonError(403, "Forbidden.", { code: API_ERROR_CODES.FORBIDDEN });
  }

  const link = linkUsers(body.userId, body.targetUserId);
  return NextResponse.json({ link }, { status: 201 });
}

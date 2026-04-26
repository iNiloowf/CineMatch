import { NextRequest } from "next/server";
import { forbiddenUserScopeResponse, requireAuthenticatedUser } from "@/server/api-auth-guard";
import { apiJsonOk } from "@/server/api-response";
import { parseJsonBody, parseSearchParams } from "@/server/api-validation";
import { getDatabase, linkUsers } from "@/server/mock-db";
import { z } from "zod";

const linksGetQuerySchema = z.object({
  userId: z.string().optional(),
});

const createLinkBodySchema = z.object({
  userId: z.string().min(1),
  targetUserId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const session = await requireAuthenticatedUser(request);
  if (!session.ok) {
    return session.response;
  }
  const { auth } = session;

  const parsedQuery = parseSearchParams(request, linksGetQuerySchema);
  if (!parsedQuery.ok) {
    return parsedQuery.response;
  }
  const userId = parsedQuery.data.userId;
  const database = getDatabase();

  if (userId && userId !== auth.userId) {
    return forbiddenUserScopeResponse(request);
  }

  const effectiveUserId = userId ?? auth.userId;

  return apiJsonOk(
    {
      links: database.links.filter((link) => link.users.includes(effectiveUserId)),
    },
    request,
  );
}

export async function POST(request: NextRequest) {
  const session = await requireAuthenticatedUser(request);
  if (!session.ok) {
    return session.response;
  }
  const { auth } = session;

  const parsedBody = await parseJsonBody(request, createLinkBodySchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;

  if (!body.userId || body.userId !== auth.userId) {
    return forbiddenUserScopeResponse(request);
  }

  const link = linkUsers(body.userId, body.targetUserId);
  return apiJsonOk({ link }, request, { status: 201 });
}

import { NextRequest } from "next/server";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { parseJsonBody, parseSearchParams } from "@/server/api-validation";
import { getDatabase, updateSettings } from "@/server/mock-db";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { z } from "zod";

const settingsGetQuerySchema = z.object({
  userId: z.string().min(1),
});

const settingsPatchSchema = z
  .object({
    userId: z.string().min(1),
  })
  .catchall(z.unknown());

export async function GET(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return apiJsonError(401, "You need to be logged in.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
      request,
    });
  }

  const parsedQuery = parseSearchParams(request, settingsGetQuerySchema);
  if (!parsedQuery.ok) {
    return parsedQuery.response;
  }
  const userId = parsedQuery.data.userId;
  const database = getDatabase();

  if (userId !== auth.userId) {
    return apiJsonError(403, "Forbidden.", { code: API_ERROR_CODES.FORBIDDEN, request });
  }

  if (!database.settings[userId]) {
    return apiJsonError(404, "Settings not found.", {
      code: API_ERROR_CODES.NOT_FOUND,
      request,
    });
  }

  return apiJsonOk({ settings: database.settings[userId] }, request);
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return apiJsonError(401, "You need to be logged in.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
      request,
    });
  }

  const parsedBody = await parseJsonBody(request, settingsPatchSchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;

  if (!body.userId || body.userId !== auth.userId) {
    return apiJsonError(403, "Forbidden.", { code: API_ERROR_CODES.FORBIDDEN, request });
  }

  const { userId: _userId, ...patch } = body;
  const settings = updateSettings(body.userId, patch);

  if (!settings) {
    return apiJsonError(404, "Settings not found.", {
      code: API_ERROR_CODES.NOT_FOUND,
      request,
    });
  }

  return apiJsonOk({ settings }, request);
}

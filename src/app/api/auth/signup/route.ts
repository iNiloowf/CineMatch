import { NextRequest } from "next/server";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { parseJsonBody } from "@/server/api-validation";
import { signupUser } from "@/server/mock-db";
import { z } from "zod";

const signupBodySchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parsedBody = await parseJsonBody(request, signupBodySchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;
  const result = signupUser(body);

  if ("error" in result) {
    return apiJsonError(409, result.error ?? "Signup failed.", {
      code: API_ERROR_CODES.CONFLICT,
      request,
    });
  }

  return apiJsonOk(result, request, { status: 201 });
}

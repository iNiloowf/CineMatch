import { NextRequest } from "next/server";
import { signupPasswordFieldSchema, signupPublicHandleFieldSchema } from "@/lib/auth-form-schemas";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { parseJsonBody } from "@/server/api-validation";
import { signupUser } from "@/server/mock-db";
import { z } from "zod";

const signupBodySchema = z.object({
  name: z.string().trim().min(1),
  publicHandle: signupPublicHandleFieldSchema,
  email: z.string().trim().email(),
  password: signupPasswordFieldSchema,
});

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return apiJsonError(404, "Not found.", {
      code: API_ERROR_CODES.NOT_FOUND,
      request,
    });
  }

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

import { NextRequest, NextResponse } from "next/server";
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
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json(result, { status: 201 });
}

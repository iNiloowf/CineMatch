import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

type ParseSuccess<T> = {
  ok: true;
  data: T;
};

type ParseFailure = {
  ok: false;
  response: NextResponse;
};

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
  request: NextRequest,
  schema: TSchema,
): Promise<ParseSuccess<z.infer<TSchema>> | ParseFailure> {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      path: issue.path.join(".") || "body",
      message: issue.message,
    }));

    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Invalid request body.",
          details,
        },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

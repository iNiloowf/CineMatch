import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { API_ERROR_CODES, apiJsonError } from "@/server/api-response";

type ParseSuccess<T> = {
  ok: true;
  data: T;
};

type ParseFailure = {
  ok: false;
  response: NextResponse;
};

function searchParamsToRecord(request: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

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
      response: apiJsonError(400, "Invalid JSON body.", {
        code: API_ERROR_CODES.INVALID_JSON,
      }),
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
      response: apiJsonError(400, "Invalid request body.", {
        code: API_ERROR_CODES.VALIDATION_ERROR,
        details,
      }),
    };
  }

  return { ok: true, data: parsed.data };
}

export function parseSearchParams<TSchema extends z.ZodTypeAny>(
  request: NextRequest,
  schema: TSchema,
): ParseSuccess<z.infer<TSchema>> | ParseFailure {
  const raw = searchParamsToRecord(request);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      path: issue.path.join(".") || "query",
      message: issue.message,
    }));

    return {
      ok: false,
      response: apiJsonError(400, "Invalid query parameters.", {
        code: API_ERROR_CODES.VALIDATION_ERROR,
        details,
      }),
    };
  }

  return { ok: true, data: parsed.data };
}

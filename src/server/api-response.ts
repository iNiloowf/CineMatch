import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Machine-readable codes for API clients; human text stays in `error`. */
export const API_ERROR_CODES = {
  INVALID_JSON: "INVALID_JSON",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
  BAD_GATEWAY: "BAD_GATEWAY",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

const DEFAULT_CODE_BY_STATUS: Partial<Record<number, ApiErrorCode>> = {
  400: API_ERROR_CODES.BAD_REQUEST,
  401: API_ERROR_CODES.UNAUTHORIZED,
  403: API_ERROR_CODES.FORBIDDEN,
  404: API_ERROR_CODES.NOT_FOUND,
  409: API_ERROR_CODES.CONFLICT,
  413: API_ERROR_CODES.PAYLOAD_TOO_LARGE,
  429: API_ERROR_CODES.RATE_LIMITED,
  500: API_ERROR_CODES.INTERNAL,
  502: API_ERROR_CODES.BAD_GATEWAY,
  503: API_ERROR_CODES.SERVICE_UNAVAILABLE,
};

/**
 * JSON error payload: `{ error, code, details? }` plus optional `extra` fields
 * (e.g. `retryAfterSeconds`) for backward compatibility with existing clients.
 */
function mergeRequestIdHeader(headers: Headers, request?: NextRequest) {
  const id = request?.headers.get("x-request-id");
  if (id) {
    headers.set("x-request-id", id);
  }
}

/** Attach `x-request-id` from the incoming request (e.g. raw `NextResponse.json` bodies). */
export function echoRequestId(response: NextResponse, request: NextRequest): NextResponse {
  mergeRequestIdHeader(response.headers, request);
  return response;
}

/** JSON success with optional `x-request-id` echo for log correlation. */
export function apiJsonOk<T>(data: T, request: NextRequest, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  mergeRequestIdHeader(headers, request);
  return NextResponse.json(data, { ...init, headers });
}

export function apiJsonError(
  status: number,
  message: string,
  options?: {
    code?: ApiErrorCode;
    details?: unknown;
    headers?: HeadersInit;
    extra?: Record<string, unknown>;
    request?: NextRequest;
  },
): NextResponse {
  const code =
    options?.code ??
    DEFAULT_CODE_BY_STATUS[status] ??
    API_ERROR_CODES.INTERNAL;

  const body: Record<string, unknown> = {
    error: message,
    code,
    ...options?.extra,
  };

  if (options?.details !== undefined) {
    body.details = options.details;
  }

  const headers = new Headers(options?.headers);
  mergeRequestIdHeader(headers, options?.request);

  return NextResponse.json(body, {
    status,
    headers,
  });
}

import { NextRequest } from "next/server";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { parseJsonBody } from "@/server/api-validation";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { clientIp, checkRateLimit } from "@/server/rate-limit";
import { logSecurityAudit } from "@/server/security-audit";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { z } from "zod";

type SwipeDecision = "accepted" | "rejected";

type SwipeRow = {
  user_id: string;
  movie_id: string;
  decision: SwipeDecision;
  created_at: string;
};

const SWIPE_WINDOW_MS = 10 * 60 * 1000;
const SWIPE_MAX = 400;
const swipeMovieSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  mediaType: z.enum(["movie", "series"]),
  year: z.number(),
  runtime: z.string().min(1),
  rating: z.number(),
  genre: z.array(z.string()),
  description: z.string(),
  trailerUrl: z.string().optional(),
  poster: z.object({
    eyebrow: z.string(),
    accentFrom: z.string(),
    accentTo: z.string(),
    imageUrl: z.string().optional(),
  }),
});
const createSwipeBodySchema = z.object({
  movie: swipeMovieSchema,
  decision: z.enum(["accepted", "rejected"]),
});
const deleteSwipeBodySchema = z.object({
  movieId: z.string().min(1),
});

async function getAuthorizedUserId(request: NextRequest) {
  const authToken = await verifyBearerFromRequest(request);

  if (!authToken) {
    return { error: "You need to be logged in first.", status: 401 as const };
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return {
      error: "Server-side account sync is not configured yet.",
      status: 500 as const,
    };
  }

  const currentUserId = authToken.userId;

  return { supabaseAdmin, currentUserId } as const;
}

export async function POST(request: NextRequest) {
  const authResult = await getAuthorizedUserId(request);

  if ("error" in authResult) {
    const code =
      authResult.status === 401
        ? API_ERROR_CODES.UNAUTHORIZED
        : API_ERROR_CODES.INTERNAL;
    return apiJsonError(authResult.status ?? 500, authResult.error ?? "Request failed.", {
      code,
      request,
    });
  }

  const { supabaseAdmin, currentUserId } = authResult;

  const createRate = checkRateLimit({
    key: `swipe:post:${currentUserId}`,
    max: SWIPE_MAX,
    windowMs: SWIPE_WINDOW_MS,
  });
  if (!createRate.ok) {
    return apiJsonError(429, "Too many swipes. Try again shortly.", {
      code: API_ERROR_CODES.RATE_LIMITED,
      headers: { "Retry-After": String(createRate.retryAfterSec) },
      request,
    });
  }

  const parsedBody = await parseJsonBody(request, createSwipeBodySchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const { movie, decision } = parsedBody.data;

  const moviePayload = {
    id: movie.id,
    title: movie.title,
    release_year: movie.year,
    runtime: movie.runtime,
    rating: movie.rating,
    genres: Array.from(
      new Set([
        ...movie.genre,
        movie.mediaType === "series" ? "Series" : "Movie",
      ]),
    ),
    description: movie.description,
    poster_eyebrow: movie.poster.eyebrow,
    poster_image_url: movie.poster.imageUrl ?? null,
    accent_from: movie.poster.accentFrom,
    accent_to: movie.poster.accentTo,
    trailer_url: movie.trailerUrl ?? null,
    updated_at: new Date().toISOString(),
  };

  const movieResult = await supabaseAdmin
    .from("movies")
    .upsert(moviePayload as never, { onConflict: "id" });

  if (movieResult.error) {
    return apiJsonError(500, movieResult.error.message, {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  const createdAt = new Date().toISOString();
  const swipePayload = {
    user_id: currentUserId,
    movie_id: movie.id,
    decision,
    created_at: createdAt,
  };

  const swipeResult = (await supabaseAdmin
    .from("swipes")
    .upsert(swipePayload as never, { onConflict: "user_id,movie_id" })
    .select("user_id, movie_id, decision, created_at")
    .single()) as {
    data: SwipeRow | null;
    error: { message?: string } | null;
  };

  if (swipeResult.error || !swipeResult.data) {
    return apiJsonError(
      500,
      swipeResult.error?.message ?? "The swipe could not be saved.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  void logSecurityAudit({
    action: "swipe_upsert",
    actorUserId: currentUserId,
    ip: clientIp(request),
    metadata: {
      movieId: movie.id,
      decision,
    },
  });

  return apiJsonOk(
    {
      swipe: swipeResult.data,
    },
    request,
  );
}

export async function DELETE(request: NextRequest) {
  const authResult = await getAuthorizedUserId(request);

  if ("error" in authResult) {
    const code =
      authResult.status === 401
        ? API_ERROR_CODES.UNAUTHORIZED
        : API_ERROR_CODES.INTERNAL;
    return apiJsonError(authResult.status ?? 500, authResult.error ?? "Request failed.", {
      code,
      request,
    });
  }

  const { supabaseAdmin, currentUserId } = authResult;

  const undoRate = checkRateLimit({
    key: `swipe:delete:${currentUserId}`,
    max: 120,
    windowMs: SWIPE_WINDOW_MS,
  });

  if (!undoRate.ok) {
    return apiJsonError(429, "Too many undo requests. Try again shortly.", {
      code: API_ERROR_CODES.RATE_LIMITED,
      headers: { "Retry-After": String(undoRate.retryAfterSec) },
      request,
    });
  }

  const parsedBody = await parseJsonBody(request, deleteSwipeBodySchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const { movieId } = parsedBody.data;

  const deleteResult = await supabaseAdmin
    .from("swipes")
    .delete()
    .eq("user_id", currentUserId)
    .eq("movie_id", movieId);

  if (deleteResult.error) {
    return apiJsonError(500, deleteResult.error.message, {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  void logSecurityAudit({
    action: "swipe_delete",
    actorUserId: currentUserId,
    ip: clientIp(request),
    metadata: { movieId },
  });

  return apiJsonOk({ ok: true }, request);
}

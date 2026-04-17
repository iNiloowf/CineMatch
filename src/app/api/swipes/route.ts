import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { clientIp, checkRateLimit } from "@/server/rate-limit";
import { logSecurityAudit } from "@/server/security-audit";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";

type SwipeDecision = "accepted" | "rejected";

type SwipeRow = {
  user_id: string;
  movie_id: string;
  decision: SwipeDecision;
  created_at: string;
};

type SwipeMoviePayload = {
  id: string;
  title: string;
  mediaType: "movie" | "series";
  year: number;
  runtime: string;
  rating: number;
  genre: string[];
  description: string;
  trailerUrl?: string;
  poster: {
    eyebrow: string;
    accentFrom: string;
    accentTo: string;
    imageUrl?: string;
  };
};

const SWIPE_WINDOW_MS = 10 * 60 * 1000;
const SWIPE_MAX = 400;

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
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { supabaseAdmin, currentUserId } = authResult;
  const body = (await request.json()) as {
    movie?: SwipeMoviePayload;
    decision?: SwipeDecision;
  };

  if (!body.movie || !body.decision) {
    return NextResponse.json(
      { error: "Movie and decision are required." },
      { status: 400 },
    );
  }

  const moviePayload = {
    id: body.movie.id,
    title: body.movie.title,
    release_year: body.movie.year,
    runtime: body.movie.runtime,
    rating: body.movie.rating,
    genres: Array.from(
      new Set([
        ...body.movie.genre,
        body.movie.mediaType === "series" ? "Series" : "Movie",
      ]),
    ),
    description: body.movie.description,
    poster_eyebrow: body.movie.poster.eyebrow,
    poster_image_url: body.movie.poster.imageUrl ?? null,
    accent_from: body.movie.poster.accentFrom,
    accent_to: body.movie.poster.accentTo,
    trailer_url: body.movie.trailerUrl ?? null,
    updated_at: new Date().toISOString(),
  };

  const movieResult = await supabaseAdmin
    .from("movies")
    .upsert(moviePayload as never, { onConflict: "id" });

  if (movieResult.error) {
    return NextResponse.json(
      { error: movieResult.error.message },
      { status: 500 },
    );
  }

  const createdAt = new Date().toISOString();
  const swipePayload = {
    user_id: currentUserId,
    movie_id: body.movie.id,
    decision: body.decision,
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
    return NextResponse.json(
      { error: swipeResult.error?.message ?? "The swipe could not be saved." },
      { status: 500 },
    );
  }

  void logSecurityAudit({
    action: "swipe_upsert",
    actorUserId: currentUserId,
    ip: clientIp(request),
    metadata: {
      movieId: body.movie.id,
      decision: body.decision,
    },
  });

  return NextResponse.json({
    swipe: swipeResult.data,
  });
}

export async function DELETE(request: NextRequest) {
  const authResult = await getAuthorizedUserId(request);

  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { supabaseAdmin, currentUserId } = authResult;

  const undoRate = checkRateLimit({
    key: `swipe:delete:${currentUserId}`,
    max: 120,
    windowMs: SWIPE_WINDOW_MS,
  });

  if (!undoRate.ok) {
    return NextResponse.json(
      { error: "Too many undo requests. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(undoRate.retryAfterSec) },
      },
    );
  }

  const body = (await request.json()) as { movieId?: string };

  if (!body.movieId) {
    return NextResponse.json(
      { error: "A movie id is required." },
      { status: 400 },
    );
  }

  const deleteResult = await supabaseAdmin
    .from("swipes")
    .delete()
    .eq("user_id", currentUserId)
    .eq("movie_id", body.movieId);

  if (deleteResult.error) {
    return NextResponse.json(
      { error: deleteResult.error.message },
      { status: 500 },
    );
  }

  void logSecurityAudit({
    action: "swipe_delete",
    actorUserId: currentUserId,
    ip: clientIp(request),
    metadata: { movieId: body.movieId },
  });

  return NextResponse.json({ ok: true });
}

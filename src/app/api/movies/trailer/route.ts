import { NextRequest, NextResponse } from "next/server";
import { fetchTmdbTrailerEmbedUrl } from "@/server/tmdb";

export async function GET(request: NextRequest) {
  const movieId = request.nextUrl.searchParams.get("movieId")?.trim();

  if (!movieId) {
    return NextResponse.json(
      { error: "A movie id is required." },
      { status: 400 },
    );
  }

  try {
    const trailerUrl = await fetchTmdbTrailerEmbedUrl(movieId);

    if (!trailerUrl) {
      return NextResponse.json(
        { error: "No trailer is available for this title yet." },
        { status: 404 },
      );
    }

    return NextResponse.json({ trailerUrl });
  } catch {
    return NextResponse.json(
      { error: "We couldn’t load the trailer right now." },
      { status: 500 },
    );
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { parseSearchParams } from "@/server/api-validation";
import { fetchTmdbTrailerEmbedUrl } from "@/server/tmdb";

const trailerQuerySchema = z.object({
  movieId: z.string().min(1, "A movie id is required."),
});

export async function GET(request: NextRequest) {
  const parsed = parseSearchParams(request, trailerQuerySchema);
  if (!parsed.ok) {
    return parsed.response;
  }
  const movieId = parsed.data.movieId.trim();

  try {
    const trailerUrl = await fetchTmdbTrailerEmbedUrl(movieId);

    if (!trailerUrl) {
      return apiJsonError(404, "No trailer is available for this title yet.", {
        code: API_ERROR_CODES.NOT_FOUND,
        request,
      });
    }

    return apiJsonOk({ trailerUrl }, request);
  } catch {
    return apiJsonError(500, "We couldn’t load the trailer right now.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }
}

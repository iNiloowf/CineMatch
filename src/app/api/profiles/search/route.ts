import { type NextRequest } from "next/server";
import { requireAuthenticatedUserWithAdmin } from "@/server/api-auth-guard";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { checkRateLimit } from "@/server/rate-limit";
import { normalizePublicHandleInput } from "@/lib/public-handle";

const WINDOW_MS = 60_000;
const MAX = 40;

type SearchRow = {
  id: string;
  full_name: string;
  public_handle: string;
  avatar_text: string;
  avatar_image_url: string | null;
};

export async function GET(request: NextRequest) {
  const session = await requireAuthenticatedUserWithAdmin(request);
  if (!session.ok) {
    return session.response;
  }
  const { supabaseAdmin: supabase, auth: token } = session;

  const rate = checkRateLimit({
    key: `profile-search:get:${token.userId}`,
    max: MAX,
    windowMs: WINDOW_MS,
  });
  if (!rate.ok) {
    return apiJsonError(429, "Too many search requests. Try again soon.", {
      code: API_ERROR_CODES.RATE_LIMITED,
      request,
    });
  }

  const { searchParams } = new URL(request.url);
  const q = normalizePublicHandleInput(searchParams.get("q") ?? "").replace(
    /[%_]/g,
    "",
  );
  if (q.length < 2) {
    return apiJsonError(400, "Type at least 2 characters to search by User ID.", {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      request,
    });
  }

  const { data, error } = (await supabase
    .from("profiles")
    .select("id, full_name, public_handle, avatar_text, avatar_image_url")
    .ilike("public_handle", `%${q}%`)
    .neq("id", token.userId)
    .order("public_handle", { ascending: true })
    .limit(25)) as {
    data: SearchRow[] | null;
    error: { message?: string } | null;
  };

  if (error) {
    return apiJsonError(500, "Search isn’t available right now.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  return apiJsonOk(
    {
      results: (data ?? []).map((row) => ({
        id: row.id,
        displayName: row.full_name,
        publicHandle: row.public_handle,
        avatarText: row.avatar_text,
        avatarImageUrl: row.avatar_image_url,
      })),
    },
    request,
  );
}

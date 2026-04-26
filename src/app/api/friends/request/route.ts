import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUserWithAdmin } from "@/server/api-auth-guard";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { checkRateLimit } from "@/server/rate-limit";
import { parseJsonBody } from "@/server/api-validation";
import { MAX_LINKED_FRIENDS } from "@/lib/social-constants";
import { normalizePublicHandleInput } from "@/lib/public-handle";

const WINDOW_MS = 60_000;
const MAX = 30;

const bodySchema = z.object({
  publicHandle: z.string().min(1),
});

function linkCount(
  links: { requester_id: string; target_id: string }[] | null,
  userId: string,
) {
  return (links ?? []).filter(
    (l) => l.requester_id === userId || l.target_id === userId,
  ).length;
}

export async function POST(request: NextRequest) {
  const session = await requireAuthenticatedUserWithAdmin(request);
  if (!session.ok) {
    return session.response;
  }
  const { supabaseAdmin: supabase, auth: token } = session;

  const rate = checkRateLimit({
    key: `friends-request:post:${token.userId}`,
    max: MAX,
    windowMs: WINDOW_MS,
  });
  if (!rate.ok) {
    return apiJsonError(429, "Too many friend requests. Wait a bit.", {
      code: API_ERROR_CODES.RATE_LIMITED,
      request,
    });
  }

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const publicHandle = normalizePublicHandleInput(parsed.data.publicHandle);
  if (publicHandle.length < 2) {
    return apiJsonError(400, "Enter a valid User ID.", {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      request,
    });
  }

  const { data: target, error: tErr } = (await supabase
    .from("profiles")
    .select("id, full_name, public_handle, avatar_text, avatar_image_url")
    .eq("public_handle", publicHandle)
    .maybeSingle()) as {
    data: {
      id: string;
      full_name: string;
      public_handle: string;
      avatar_text: string;
      avatar_image_url: string | null;
    } | null;
    error: unknown;
  };

  if (tErr) {
    return apiJsonError(500, "Couldn’t look up that User ID.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  if (!target) {
    return apiJsonError(404, "No one uses that User ID yet.", {
      code: API_ERROR_CODES.NOT_FOUND,
      request,
    });
  }

  if (target.id === token.userId) {
    return apiJsonError(400, "You can’t send a request to yourself.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  const { data: myLinks } = (await supabase
    .from("linked_users")
    .select("id, requester_id, target_id, status, created_at")
    .or(`requester_id.eq.${token.userId},target_id.eq.${token.userId}`)) as {
    data: {
      id: string;
      requester_id: string;
      target_id: string;
      status: string;
      created_at: string;
    }[] | null;
  };

  const { data: theirLinks } = (await supabase
    .from("linked_users")
    .select("id, requester_id, target_id, status, created_at")
    .or(`requester_id.eq.${target.id},target_id.eq.${target.id}`)) as {
    data: {
      id: string;
      requester_id: string;
      target_id: string;
      status: string;
      created_at: string;
    }[] | null;
  };

  if (linkCount(myLinks, token.userId) >= MAX_LINKED_FRIENDS) {
    return apiJsonError(
      400,
      `You can have at most ${MAX_LINKED_FRIENDS} friend links (including pending). Remove one first.`,
      { code: API_ERROR_CODES.BAD_REQUEST, request },
    );
  }

  if (linkCount(theirLinks, target.id) >= MAX_LINKED_FRIENDS) {
    return apiJsonError(400, "This person can’t add more friend links right now.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  const forward = (myLinks ?? []).find(
    (l) => l.requester_id === token.userId && l.target_id === target.id,
  );
  const reverse = (myLinks ?? []).find(
    (l) => l.requester_id === target.id && l.target_id === token.userId,
  );

  if (forward?.status === "accepted" || reverse?.status === "accepted") {
    return apiJsonError(409, "You’re already friends with this person.", {
      code: API_ERROR_CODES.CONFLICT,
      request,
    });
  }

  if (forward?.status === "pending") {
    return apiJsonError(409, "You already have a pending request to this person.", {
      code: API_ERROR_CODES.CONFLICT,
      request,
    });
  }

  if (reverse?.status === "pending") {
    const { data: accepted, error: accErr } = (await supabase
      .from("linked_users")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      } as never)
      .eq("id", reverse.id)
      .eq("status", "pending")
      .select("id, requester_id, target_id, status, created_at")
      .maybeSingle()) as {
      data: {
        id: string;
        requester_id: string;
        target_id: string;
        status: string;
        created_at: string;
      } | null;
      error: unknown;
    };

    if (accErr) {
      return apiJsonError(500, "Couldn’t accept that request right now.", {
        code: API_ERROR_CODES.INTERNAL,
        request,
      });
    }

    return apiJsonOk(
      {
        kind: "auto_accepted",
        link: accepted,
        user: {
          id: target.id,
          displayName: target.full_name,
          publicHandle: target.public_handle,
          avatarText: target.avatar_text,
          avatarImageUrl: target.avatar_image_url,
        },
      },
      request,
    );
  }

  const { data: inserted, error: insErr } = (await supabase
    .from("linked_users")
    .insert({
      requester_id: token.userId,
      target_id: target.id,
      status: "pending",
    } as never)
    .select("id, requester_id, target_id, status, created_at")
    .single()) as {
    data: {
      id: string;
      requester_id: string;
      target_id: string;
      status: string;
      created_at: string;
    } | null;
    error: { code?: string; message?: string } | null;
  };

  if (insErr) {
    if (insErr.code === "23505" || (insErr.message ?? "").toLowerCase().includes("unique")) {
      return apiJsonError(409, "A link with this person is already in progress.", {
        code: API_ERROR_CODES.CONFLICT,
        request,
      });
    }
    return apiJsonError(500, "Couldn’t send that request.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  return apiJsonOk(
    {
      kind: "request_sent",
      link: inserted,
      user: {
        id: target.id,
        displayName: target.full_name,
        publicHandle: target.public_handle,
        avatarText: target.avatar_text,
        avatarImageUrl: target.avatar_image_url,
      },
    },
    request,
  );
}

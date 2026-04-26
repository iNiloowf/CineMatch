import { NextRequest } from "next/server";
import { requireAuthenticatedUserWithAdmin } from "@/server/api-auth-guard";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";

const PROFILE_PHOTOS_BUCKET = "profile-photos";
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await requireAuthenticatedUserWithAdmin(request);
  if (!session.ok) {
    return session.response;
  }
  const { supabaseAdmin: admin, auth } = session;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiJsonError(400, "Invalid upload payload.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  const fileEntry = formData.get("file");
  const file = fileEntry instanceof File ? fileEntry : null;

  if (!file) {
    return apiJsonError(400, "No photo was provided.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  if (!file.type.startsWith("image/")) {
    return apiJsonError(400, "Only image uploads are allowed.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return apiJsonError(
      413,
      "Photo is too large. Please choose a smaller image.",
      { code: API_ERROR_CODES.PAYLOAD_TOO_LARGE, request },
    );
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  const filePath = `${auth.userId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

  const uploadResult = await admin.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || undefined,
    });

  if (uploadResult.error) {
    return apiJsonError(
      500,
      uploadResult.error.message || "Photo upload failed.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  const signedUrlResult = await admin.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365);

  const imageUrl = signedUrlResult.data?.signedUrl;

  if (!imageUrl) {
    return apiJsonError(500, "Could not resolve uploaded photo URL.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  return apiJsonOk({ imageUrl }, request);
}

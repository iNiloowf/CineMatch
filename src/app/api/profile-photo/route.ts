import { NextRequest, NextResponse } from "next/server";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { getSupabaseAdminClient } from "@/server/supabase-admin";

const PROFILE_PHOTOS_BUCKET = "profile-photos";
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);

  if (!auth) {
    return NextResponse.json({ error: "You need to be logged in." }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  if (!admin) {
    return NextResponse.json(
      { error: "Photo upload service is not configured." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload payload." }, { status: 400 });
  }

  const fileEntry = formData.get("file");
  const file = fileEntry instanceof File ? fileEntry : null;

  if (!file) {
    return NextResponse.json({ error: "No photo was provided." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Photo is too large. Please choose a smaller image." },
      { status: 413 },
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
    return NextResponse.json(
      { error: uploadResult.error.message || "Photo upload failed." },
      { status: 500 },
    );
  }

  const signedUrlResult = await admin.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .createSignedUrl(filePath, 60 * 60 * 24 * 365);

  const imageUrl = signedUrlResult.data?.signedUrl;

  if (!imageUrl) {
    return NextResponse.json(
      { error: "Could not resolve uploaded photo URL." },
      { status: 500 },
    );
  }

  return NextResponse.json({ imageUrl });
}


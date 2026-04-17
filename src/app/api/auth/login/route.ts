import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseJsonBody } from "@/server/api-validation";
import { loginUser } from "@/server/mock-db";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { z } from "zod";

const MAX_SAFE_AUTH_METADATA_FIELD_LENGTH = 4096;
const loginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const parsedBody = await parseJsonBody(request, loginBodySchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (supabaseUrl && supabasePublishableKey) {
    const createBrowserStyleClient = () =>
      createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

    let supabase = createBrowserStyleClient();
    let { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error || !data.user || !data.session) {
      return NextResponse.json(
        { error: error?.message ?? "Invalid email or password." },
        { status: 401 },
      );
    }

    const avatarMetadata = data.user.user_metadata?.avatar_image_url;

    if (
      typeof avatarMetadata === "string" &&
      avatarMetadata.length > MAX_SAFE_AUTH_METADATA_FIELD_LENGTH
    ) {
      const supabaseAdmin = getSupabaseAdminClient();

      if (supabaseAdmin) {
        const sanitizedMetadata = {
          ...(data.user.user_metadata ?? {}),
          avatar_image_url: null,
        };

        await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
          user_metadata: sanitizedMetadata,
        });

        supabase = createBrowserStyleClient();
        const retryResult = await supabase.auth.signInWithPassword({
          email: body.email,
          password: body.password,
        });

        if (!retryResult.error && retryResult.data.user && retryResult.data.session) {
          data = retryResult.data;
          error = null;
        }
      }
    }

    return NextResponse.json({
      user: data.user,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
      },
    });
  }

  const user = loginUser(body.email, body.password);

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  return NextResponse.json({ user });
}

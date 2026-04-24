import { type NextRequest, NextResponse } from "next/server";
import { publicAppOriginForInviteLinks } from "@/lib/public-app-origin";
import { getSupabaseAdminClient } from "@/server/supabase-admin";

function baseUrl(request: NextRequest) {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
  return publicAppOriginForInviteLinks(raw);
}

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { code: raw } = await context.params;
  const code = (raw ?? "").toLowerCase().trim();
  if (!/^[a-z0-9]{6,20}$/.test(code)) {
    return NextResponse.redirect(new URL("/connect", baseUrl(request)));
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.redirect(new URL("/connect", baseUrl(request)));
  }

  const result = (await supabaseAdmin
    .from("invite_links")
    .select("token")
    .eq("link_code", code)
    .maybeSingle()) as { data: { token: string } | null; error: unknown };

  if (result.data?.token) {
    const target = new URL("/connect", baseUrl(request));
    target.searchParams.set("invite", result.data.token);
    return NextResponse.redirect(target, 302);
  }

  return NextResponse.redirect(new URL("/connect", baseUrl(request)));
}

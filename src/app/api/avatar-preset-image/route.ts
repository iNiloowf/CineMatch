import { NextRequest, NextResponse } from "next/server";

/** Only TMDB poster hosts (editor default posters). */
const ALLOWED = /^https:\/\/image\.tmdb\.org\/t\/p\/[^/]+\/[^/]+$/i;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" || !ALLOWED.test(parsed.href)) {
    return NextResponse.json({ error: "Url not allowed" }, { status: 400 });
  }

  try {
    const res = await fetch(parsed.href, {
      headers: { Accept: "image/*,*/*" },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream failed" }, { status: 502 });
    }
    const buf = await res.arrayBuffer();
    if (!buf.byteLength) {
      return NextResponse.json({ error: "Empty body" }, { status: 502 });
    }
    const ct = res.headers.get("content-type") || "image/jpeg";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ct.startsWith("image/") ? ct : "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  password: z.string().min(1),
});

/**
 * Development-only: checks the shared offline demo password without exposing it to the client bundle.
 * Returns 404 outside `development` so the route is not a useful probe in production.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const expected = process.env.OFFLINE_DEMO_PASSWORD?.trim();
  if (!expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (parsed.data.password !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

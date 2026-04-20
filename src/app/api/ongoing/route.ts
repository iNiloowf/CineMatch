import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseSearchParams } from "@/server/api-validation";
import { getSharedWatchlist } from "@/server/mock-db";

const ongoingQuerySchema = z.object({
  userId: z.string().min(1, "userId is required."),
});

export async function GET(request: NextRequest) {
  const parsed = parseSearchParams(request, ongoingQuerySchema);
  if (!parsed.ok) {
    return parsed.response;
  }
  const userId = parsed.data.userId;

  const ongoing = getSharedWatchlist(userId).filter(
    (entry) => entry.progress > 0 && entry.progress < 100 && !entry.watched,
  );

  return NextResponse.json({ ongoing });
}

import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api/auth";
import { getAnalyticsData } from "@/lib/analytics";
import { resolveDateRange } from "@/lib/date-range";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";
import { apiError } from "@/lib/api/respond";

const PLATFORMS: SocialPlatform[] = ["instagram", "tiktok"];

/**
 * GET /api/v1/analytics?range=30d&platform=instagram&brandId=...
 * Same aggregation the Analytics page renders - `range` accepts the usual
 * 7d/30d/90d/1y presets or `custom` with `from`/`to` (YYYY-MM-DD).
 */
export async function GET(request: Request) {
  const ctx = await requireApiContext(request);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const platformParam = searchParams.get("platform");
  if (platformParam && !PLATFORMS.includes(platformParam as SocialPlatform)) {
    return apiError(400, `platform must be one of: ${PLATFORMS.join(", ")}`);
  }

  const range = resolveDateRange({
    range: searchParams.get("range") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  const data = await getAnalyticsData(ctx.brand.id, range, platformParam as SocialPlatform | undefined);
  return NextResponse.json({ range, ...data });
}

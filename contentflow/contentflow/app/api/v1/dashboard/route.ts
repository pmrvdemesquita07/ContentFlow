import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api/auth";
import { getDashboardOverview } from "@/lib/dashboard";
import { resolveDateRange } from "@/lib/date-range";

/**
 * GET /api/v1/dashboard?range=30d&brandId=...
 * Same overview the Dashboard page renders (top performers, running
 * campaigns, a snapshot over `range` - defaults to 30d like the page -
 * open tasks, upcoming calendar).
 */
export async function GET(request: Request) {
  const ctx = await requireApiContext(request);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const range = resolveDateRange({
    range: searchParams.get("range") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  const overview = await getDashboardOverview(ctx.brand.id, range);
  return NextResponse.json({ range, ...overview });
}

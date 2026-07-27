import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api/auth";
import { getDashboardOverview } from "@/lib/dashboard";

/** GET /api/v1/dashboard?brandId=... - same overview the Dashboard page renders (top performers, running campaigns, 7-day snapshot, open tasks, upcoming calendar). */
export async function GET(request: Request) {
  const ctx = await requireApiContext(request);
  if ("error" in ctx) return ctx.error;

  const overview = await getDashboardOverview(ctx.brand.id);
  return NextResponse.json(overview);
}

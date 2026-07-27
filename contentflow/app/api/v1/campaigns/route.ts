import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api/auth";
import { getCampaignsForBrand } from "@/lib/campaigns";

/** GET /api/v1/campaigns?brandId=... - every campaign for the resolved brand, with rollup totals/ROI. */
export async function GET(request: Request) {
  const ctx = await requireApiContext(request);
  if ("error" in ctx) return ctx.error;

  const campaigns = await getCampaignsForBrand(ctx.brand.id);
  return NextResponse.json({ campaigns });
}

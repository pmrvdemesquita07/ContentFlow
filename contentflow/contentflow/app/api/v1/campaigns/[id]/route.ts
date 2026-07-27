import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api/auth";
import { getCampaignDetail } from "@/lib/campaigns";
import { apiError } from "@/lib/api/respond";

/** GET /api/v1/campaigns/:id?brandId=... - one campaign with its posts, totals and ROI. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiContext(request);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const campaign = await getCampaignDetail(id, ctx.brand.id);
  if (!campaign) return apiError(404, "Campaign not found.");

  return NextResponse.json({ campaign });
}

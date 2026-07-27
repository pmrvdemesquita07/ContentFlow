import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api/auth";
import { getContentById } from "@/lib/content";
import { apiError } from "@/lib/api/respond";

/** GET /api/v1/content/:id?brandId=... - a single content item, scoped to the resolved brand. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiContext(request);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const content = await getContentById(id, ctx.brand.id);
  if (!content) return apiError(404, "Content not found.");

  return NextResponse.json({ content });
}

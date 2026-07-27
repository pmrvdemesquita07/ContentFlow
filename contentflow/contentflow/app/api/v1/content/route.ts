import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api/auth";
import { getContentByStatuses } from "@/lib/content";
import type { ContentStatus } from "@/lib/generated/prisma/enums";

const ALL_STATUSES: ContentStatus[] = ["idea", "draft", "scheduled", "published", "archived"];

function isContentStatus(value: string): value is ContentStatus {
  return (ALL_STATUSES as string[]).includes(value);
}

/**
 * GET /api/v1/content?status=draft,scheduled&brandId=...
 * Lists content for the resolved brand. `status` is a comma-separated
 * filter (defaults to every status) matching the same statuses used
 * throughout the web app (idea/draft/scheduled/published/archived).
 */
export async function GET(request: Request) {
  const ctx = await requireApiContext(request);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const statuses = statusParam
    ? statusParam.split(",").map((s) => s.trim()).filter(isContentStatus)
    : ALL_STATUSES;

  const content = await getContentByStatuses(ctx.brand.id, statuses.length ? statuses : ALL_STATUSES);
  return NextResponse.json({ content });
}

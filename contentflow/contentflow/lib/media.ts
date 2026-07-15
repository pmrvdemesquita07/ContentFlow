import { prisma } from "@/lib/db";
import type { ContentType } from "@/lib/generated/prisma/enums";

export function getMediaForWorkspace(workspaceId: string) {
  return prisma.media.findMany({
    where: { workspaceId },
    include: { content: { select: { id: true, title: true } } },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function getSyncedMediaForBrand(brandId: string, type?: ContentType) {
  const content = await prisma.content.findMany({
    where: { brandId, externalId: { not: null }, ...(type ? { type } : {}) },
    include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 } },
    orderBy: { publishedAt: "desc" },
  });

  return content.map((c) => {
    const latest = c.metrics[0];
    return {
      id: c.id,
      title: c.title,
      type: c.type,
      thumbnailUrl: c.thumbnailUrl,
      externalUrl: c.externalUrl,
      publishedAt: c.publishedAt,
      platforms: c.platforms,
      interactions: latest ? latest.likes + latest.comments + latest.shares + latest.saved : 0,
    };
  });
}

import { prisma } from "@/lib/db";
import type { ContentStatus } from "@/lib/generated/prisma/enums";

const WITH_RELATIONS = {
  include: {
    tasks: { orderBy: { createdAt: "asc" } },
    media: true,
    metrics: { orderBy: { capturedAt: "desc" }, take: 1 },
  },
} as const;

export function getContentByStatuses(brandId: string, statuses: ContentStatus[]) {
  return prisma.content.findMany({
    where: { brandId, status: { in: statuses } },
    orderBy: { updatedAt: "desc" },
    ...WITH_RELATIONS,
  });
}

export function getScheduledContent(brandId: string) {
  return prisma.content.findMany({
    where: { brandId, scheduledAt: { not: null } },
    orderBy: { scheduledAt: "asc" },
    ...WITH_RELATIONS,
  });
}

import { prisma } from "@/lib/db";
import type { ContentStatus } from "@/lib/generated/prisma/enums";

const ENGAGEMENT_ALERT_THRESHOLD = 500;

export async function getDashboardData(brandId: string) {
  const [statusCounts, contentWithMetrics] = await Promise.all([
    prisma.content.groupBy({
      by: ["status"],
      where: { brandId },
      _count: { _all: true },
    }),
    prisma.content.findMany({
      where: { brandId, metrics: { some: {} } },
      include: { metrics: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const counts: Record<ContentStatus, number> = {
    idea: 0,
    draft: 0,
    scheduled: 0,
    published: 0,
    archived: 0,
  };
  for (const row of statusCounts) counts[row.status] = row._count._all;

  const highEngagement = contentWithMetrics
    .map((content) => {
      const latestByPlatform = new Map<string, (typeof content.metrics)[number]>();
      for (const metric of content.metrics) {
        const current = latestByPlatform.get(metric.platform);
        if (!current || metric.capturedAt > current.capturedAt) {
          latestByPlatform.set(metric.platform, metric);
        }
      }
      const interactions = [...latestByPlatform.values()].reduce(
        (sum, m) => sum + m.likes + m.comments + m.shares + m.saved,
        0
      );
      return { content, interactions };
    })
    .filter((row) => row.interactions >= ENGAGEMENT_ALERT_THRESHOLD)
    .sort((a, b) => b.interactions - a.interactions);

  return { counts, highEngagement, hasAnyMetrics: contentWithMetrics.length > 0 };
}

import { prisma } from "@/lib/db";
import type { ContentStatus } from "@/lib/generated/prisma/enums";

const ENGAGEMENT_ALERT_THRESHOLD = 500;

export const DASHBOARD_RANGES = {
  "7d": { label: "7 days", days: 7 },
  "30d": { label: "30 days", days: 30 },
  "90d": { label: "90 days", days: 90 },
  "1y": { label: "1 year", days: 365 },
} as const;

export type DashboardRange = keyof typeof DASHBOARD_RANGES;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getDashboardData(brandId: string, range: DashboardRange = "30d") {
  const rangeStart = new Date(Date.now() - DASHBOARD_RANGES[range].days * 24 * 60 * 60 * 1000);

  const [statusCounts, contentWithMetrics, socialAccounts, accountSnapshots, periodMetrics] =
    await Promise.all([
      prisma.content.groupBy({
        by: ["status"],
        where: { brandId },
        _count: { _all: true },
      }),
      prisma.content.findMany({
        where: { brandId, metrics: { some: {} }, publishedAt: { gte: rangeStart } },
        include: { metrics: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.socialAccount.findMany({ where: { brandId } }),
      prisma.accountSnapshot.findMany({
        where: { socialAccount: { brandId }, capturedAt: { gte: rangeStart } },
        orderBy: { capturedAt: "asc" },
      }),
      prisma.metric.findMany({
        where: { content: { brandId }, capturedAt: { gte: rangeStart } },
        orderBy: { capturedAt: "asc" },
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
        (sum, m) => sum + m.likes + m.comments + m.shares + m.saved + m.replies,
        0
      );
      return { content, interactions };
    })
    .filter((row) => row.interactions >= ENGAGEMENT_ALERT_THRESHOLD)
    .sort((a, b) => b.interactions - a.interactions);

  const followerTotals = {
    followers: socialAccounts.reduce((sum, a) => sum + (a.followersCount ?? 0), 0),
    following: socialAccounts.reduce((sum, a) => sum + (a.followingCount ?? 0), 0),
  };

  // One snapshot per sync, so dedupe to the latest per account+day before
  // summing across accounts - otherwise a same-day resync would double count.
  const latestSnapshotPerAccountDay = new Map<string, (typeof accountSnapshots)[number]>();
  for (const snap of accountSnapshots) {
    const key = `${snap.socialAccountId}:${dayKey(snap.capturedAt)}`;
    const existing = latestSnapshotPerAccountDay.get(key);
    if (!existing || snap.capturedAt > existing.capturedAt) {
      latestSnapshotPerAccountDay.set(key, snap);
    }
  }
  const followersByDay = new Map<string, number>();
  for (const snap of latestSnapshotPerAccountDay.values()) {
    const key = dayKey(snap.capturedAt);
    followersByDay.set(key, (followersByDay.get(key) ?? 0) + snap.followersCount);
  }
  const followerSeries = [...followersByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, followers]) => ({ label: day, value: followers }));

  const latestMetricPerContentDay = new Map<string, (typeof periodMetrics)[number]>();
  for (const m of periodMetrics) {
    const key = `${m.contentId}:${m.platform}:${dayKey(m.capturedAt)}`;
    const existing = latestMetricPerContentDay.get(key);
    if (!existing || m.capturedAt > existing.capturedAt) {
      latestMetricPerContentDay.set(key, m);
    }
  }
  const engagementByDay = new Map<string, number>();
  for (const m of latestMetricPerContentDay.values()) {
    const key = dayKey(m.capturedAt);
    const interactions = m.likes + m.comments + m.shares + m.saved + m.replies;
    engagementByDay.set(key, (engagementByDay.get(key) ?? 0) + interactions);
  }
  const engagementSeries = [...engagementByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, interactions]) => ({ label: day, value: interactions }));

  return {
    counts,
    highEngagement,
    hasAnyMetrics: contentWithMetrics.length > 0,
    followerTotals,
    hasAnyAccounts: socialAccounts.length > 0,
    followerSeries,
    engagementSeries,
  };
}

import { prisma } from "@/lib/db";
import type { ContentStatus } from "@/lib/generated/prisma/enums";

export { DASHBOARD_RANGES, resolveDateRange } from "@/lib/date-range";
export type { DashboardRangeKey, ResolvedRange } from "@/lib/date-range";
import type { ResolvedRange } from "@/lib/date-range";

const ENGAGEMENT_ALERT_THRESHOLD = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function interactionsOf(m: {
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  replies: number;
}) {
  return m.likes + m.comments + m.shares + m.saved + m.replies;
}

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** % change vs the previous value; null when there's no baseline to compare against. */
function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Everything the Dashboard needs to be a real landing page instead of just
 * a status-counts view - top performers, campaigns actually running right
 * now, a fixed trailing-7-day snapshot (independent of whatever range the
 * charts below are set to), open tasks, and today/tomorrow's calendar.
 */
export async function getDashboardOverview(brandId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
  const dayAfterTomorrowStart = new Date(todayStart.getTime() + 2 * DAY_MS);
  const sevenDaysAgo = new Date(todayStart.getTime() - 7 * DAY_MS);
  const fourteenDaysAgo = new Date(todayStart.getTime() - 14 * DAY_MS);
  const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * DAY_MS);

  const [topPerformersRaw, campaigns, tasks, calendarItems, currentPeriodMetrics, previousPeriodMetrics] =
    await Promise.all([
      prisma.content.findMany({
        where: { brandId, publishedAt: { gte: thirtyDaysAgo }, metrics: { some: {} } },
        include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 } },
        orderBy: { publishedAt: "desc" },
        take: 50,
      }),
      prisma.campaign.findMany({ where: { brandId }, orderBy: { createdAt: "desc" } }),
      prisma.task.findMany({
        where: { brandId, status: { not: "done" } },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        take: 5,
      }),
      prisma.content.findMany({
        where: {
          brandId,
          OR: [
            { scheduledAt: { gte: todayStart, lt: dayAfterTomorrowStart } },
            { publishedAt: { gte: todayStart, lt: dayAfterTomorrowStart } },
          ],
        },
        orderBy: { scheduledAt: "asc" },
        select: { id: true, title: true, type: true, status: true, scheduledAt: true, publishedAt: true },
      }),
      prisma.metric.findMany({
        where: { content: { brandId }, capturedAt: { gte: sevenDaysAgo } },
      }),
      prisma.metric.findMany({
        where: { content: { brandId }, capturedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      }),
    ]);

  const topPerformers = topPerformersRaw
    .map((content) => ({
      id: content.id,
      title: content.title,
      type: content.type,
      thumbnailUrl: content.thumbnailUrl,
      interactions: content.metrics[0] ? interactionsOf(content.metrics[0]) : 0,
    }))
    .filter((p) => p.interactions > 0)
    .sort((a, b) => b.interactions - a.interactions)
    .slice(0, 5);

  const activeCampaigns = campaigns.filter((c) => {
    if (c.startDate && c.startDate > now) return false;
    if (c.endDate && c.endDate < now) return false;
    return true;
  });

  const sum7 = currentPeriodMetrics.reduce(
    (acc, m) => ({
      interactions: acc.interactions + interactionsOf(m),
      reach: acc.reach + m.reach,
      posts: acc.posts,
    }),
    { interactions: 0, reach: 0, posts: 0 }
  );
  sum7.posts = new Set(currentPeriodMetrics.map((m) => m.contentId)).size;

  const sumPrevious7 = previousPeriodMetrics.reduce(
    (acc, m) => ({ interactions: acc.interactions + interactionsOf(m), reach: acc.reach + m.reach }),
    { interactions: 0, reach: 0 }
  );

  const last7Days = {
    posts: sum7.posts,
    interactions: sum7.interactions,
    reach: sum7.reach,
    interactionsGrowth: growthPercent(sum7.interactions, sumPrevious7.interactions),
    reachGrowth: growthPercent(sum7.reach, sumPrevious7.reach),
  };

  const todayItems = calendarItems.filter((item) => {
    const d = item.scheduledAt ?? item.publishedAt;
    return d && d >= todayStart && d < tomorrowStart;
  });
  const tomorrowItems = calendarItems.filter((item) => {
    const d = item.scheduledAt ?? item.publishedAt;
    return d && d >= tomorrowStart && d < dayAfterTomorrowStart;
  });

  return {
    topPerformers,
    activeCampaigns,
    last7Days,
    upcomingTasks: tasks,
    todayItems,
    tomorrowItems,
  };
}

export async function getDashboardData(brandId: string, range: ResolvedRange) {
  const { start, end } = range;

  const [statusCounts, contentWithMetrics, socialAccounts, accountSnapshots, periodMetrics] =
    await Promise.all([
      prisma.content.groupBy({
        by: ["status"],
        where: { brandId },
        _count: { _all: true },
      }),
      prisma.content.findMany({
        where: { brandId, metrics: { some: {} }, publishedAt: { gte: start, lte: end } },
        include: { metrics: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.socialAccount.findMany({ where: { brandId } }),
      prisma.accountSnapshot.findMany({
        where: { socialAccount: { brandId }, capturedAt: { gte: start, lte: end } },
        orderBy: { capturedAt: "asc" },
      }),
      prisma.metric.findMany({
        where: { content: { brandId }, capturedAt: { gte: start, lte: end } },
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

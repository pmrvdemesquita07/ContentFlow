import { prisma } from "@/lib/db";
import { interactionsOf, latestSnapshotPerPlatform } from "@/lib/metrics";
import type { ContentStatus, ContentType } from "@/lib/generated/prisma/enums";

export { DASHBOARD_RANGES, resolveDateRange } from "@/lib/date-range";
export type { DashboardRangeKey, ResolvedRange } from "@/lib/date-range";
import type { ResolvedRange } from "@/lib/date-range";

const ENGAGEMENT_ALERT_THRESHOLD = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Stories and reels are counted on their own: lumping them into "posts
 * published" makes the number disagree with what Instagram shows, since 40
 * stories in a week would read as 40 posts. */
function formatOf(type: ContentType): "posts" | "stories" | "reels" {
  if (type === "story") return "stories";
  if (type === "reel") return "reels";
  return "posts";
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
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

type PeriodMetric = {
  platform: string;
  capturedAt: Date;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  replies: number;
};

type PeriodContent = { type: ContentType; metrics: PeriodMetric[] };

/**
 * Totals for one window of published content.
 *
 * `reach` is the sum of each post's own reach. That is NOT the number of
 * unique people reached: someone who saw four of your posts is counted in all
 * four. A deduplicated figure only exists as a separate account-level insight
 * the platforms report for fixed periods, which we don't sync - so the UI has
 * to say "summed across posts" rather than imply unique people.
 */
function summarisePeriod(contents: PeriodContent[]) {
  const totals = {
    posts: 0,
    stories: 0,
    reels: 0,
    interactions: 0,
    reach: 0,
    publishedWithMetrics: 0,
  };

  for (const content of contents) {
    totals[formatOf(content.type)] += 1;

    const latest = latestSnapshotPerPlatform(content.metrics);
    if (latest.length > 0) totals.publishedWithMetrics += 1;
    for (const metric of latest) {
      totals.interactions += interactionsOf(metric);
      totals.reach += metric.reach;
    }
  }

  return totals;
}

/**
 * Everything the Dashboard needs to be a real landing page instead of just
 * a status-counts view - top performers, campaigns actually running right
 * now, a snapshot over the selected date range (compared against the same-
 * length period immediately before it), open tasks, and today/tomorrow's
 * calendar.
 */
export async function getDashboardOverview(brandId: string, range: ResolvedRange) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
  const dayAfterTomorrowStart = new Date(todayStart.getTime() + 2 * DAY_MS);

  const periodLength = range.end.getTime() - range.start.getTime();
  const previousPeriodStart = new Date(range.start.getTime() - periodLength);

  const [topPerformersRaw, campaigns, tasks, calendarItems, currentPeriodContent, previousPeriodContent] =
    await Promise.all([
      prisma.content.findMany({
        where: { brandId, publishedAt: { gte: range.start, lte: range.end }, metrics: { some: {} } },
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
      // Windowed by when the content was *published*, not when we happened to
      // sync it. Syncing is what fills `capturedAt`, so filtering on that made
      // "last 7 days" mean "whatever we re-synced this week" - every post ever
      // published if a sync ran, and nothing at all if one didn't.
      prisma.content.findMany({
        where: { brandId, publishedAt: { gte: range.start, lte: range.end } },
        select: { id: true, type: true, metrics: true },
      }),
      prisma.content.findMany({
        where: { brandId, publishedAt: { gte: previousPeriodStart, lt: range.start } },
        select: { id: true, type: true, metrics: true },
      }),
    ]);

  const topPerformersFlat = topPerformersRaw
    .map((content) => ({
      id: content.id,
      title: content.title,
      type: content.type,
      thumbnailUrl: content.thumbnailUrl,
      // Synced content is created with a single originating platform - the
      // first entry is the real one to attribute a post's performance to.
      platform: content.platforms[0] ?? null,
      interactions: content.metrics[0] ? interactionsOf(content.metrics[0]) : 0,
    }))
    .filter((p) => p.interactions > 0)
    .sort((a, b) => b.interactions - a.interactions);

  const topPerformers = topPerformersFlat.slice(0, 5);

  // Grouped by platform so a high-view-count TikTok video can't crowd out
  // Instagram's top posts (or vice versa) in a single combined list.
  const byPlatform = new Map<string, typeof topPerformersFlat>();
  for (const post of topPerformersFlat) {
    if (!post.platform) continue;
    const list = byPlatform.get(post.platform) ?? [];
    if (list.length < 5) list.push(post);
    byPlatform.set(post.platform, list);
  }
  const topPerformersByPlatform = [...byPlatform.entries()].map(([platform, posts]) => ({
    platform,
    posts,
  }));

  const activeCampaigns = campaigns.filter((c) => {
    if (c.startDate && c.startDate > now) return false;
    if (c.endDate && c.endDate < now) return false;
    return true;
  });

  const sumCurrent = summarisePeriod(currentPeriodContent);
  const sumPrevious = summarisePeriod(previousPeriodContent);

  const currentPeriod = {
    posts: sumCurrent.posts,
    stories: sumCurrent.stories,
    reels: sumCurrent.reels,
    interactions: sumCurrent.interactions,
    reach: sumCurrent.reach,
    avgReachPerPost: sumCurrent.publishedWithMetrics
      ? Math.round(sumCurrent.reach / sumCurrent.publishedWithMetrics)
      : 0,
    interactionsGrowth: growthPercent(sumCurrent.interactions, sumPrevious.interactions),
    reachGrowth: growthPercent(sumCurrent.reach, sumPrevious.reach),
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
    topPerformersByPlatform,
    activeCampaigns,
    currentPeriod,
    upcomingTasks: tasks,
    todayItems,
    tomorrowItems,
  };
}

export async function getDashboardData(brandId: string, range: ResolvedRange) {
  const { start, end } = range;

  const [statusCounts, contentWithMetrics, socialAccounts, accountSnapshots] =
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
      const interactions = latestSnapshotPerPlatform(content.metrics).reduce(
        (sum, m) => sum + interactionsOf(m),
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

  // Bucketed by the day each post was *published*, so the line reads "what
  // the content published that day earned" - the same rule the Analytics page
  // uses. Bucketing by capturedAt instead drew every post's lifetime total on
  // whichever day a sync happened to run, which made the chart climb forever
  // and disagree with Analytics for the same brand and period.
  const engagementByDay = new Map<string, number>();
  for (const content of contentWithMetrics) {
    if (!content.publishedAt) continue;
    const key = dayKey(content.publishedAt);
    const interactions = latestSnapshotPerPlatform(content.metrics).reduce(
      (sum, m) => sum + interactionsOf(m),
      0
    );
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

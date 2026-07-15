import { prisma } from "@/lib/db";
import type { ContentType } from "@/lib/generated/prisma/enums";
import { DASHBOARD_RANGES, type DashboardRange } from "@/lib/dashboard";

const EMPTY_TOTALS = { likes: 0, comments: 0, shares: 0, reach: 0, saved: 0, videoViews: 0 };

type Totals = typeof EMPTY_TOTALS;

function addMetric<T extends Totals>(acc: T, m: Totals) {
  acc.likes += m.likes;
  acc.comments += m.comments;
  acc.shares += m.shares;
  acc.reach += m.reach;
  acc.saved += m.saved;
  acc.videoViews += m.videoViews;
  return acc;
}

/** % change vs the previous value; null when there's no baseline to compare against ("new"). */
function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

export async function getAnalyticsData(brandId: string, range: DashboardRange = "30d") {
  const rangeStart = new Date(Date.now() - DASHBOARD_RANGES[range].days * 24 * 60 * 60 * 1000);

  const [metrics, socialAccounts, accountSnapshots] = await Promise.all([
    prisma.metric.findMany({
      where: { content: { brandId } },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            campaignId: true,
            type: true,
            thumbnailUrl: true,
            externalUrl: true,
          },
        },
      },
      orderBy: { capturedAt: "desc" },
    }),
    prisma.socialAccount.findMany({ where: { brandId } }),
    prisma.accountSnapshot.findMany({ where: { socialAccount: { brandId } } }),
  ]);

  // Metric rows are snapshots over time (one per sync), so only the most
  // recent snapshot per content+platform reflects current totals - summing
  // every historical row would multiply counts by however many times we've synced.
  const latestByContentPlatform = new Map<string, (typeof metrics)[number]>();
  for (const m of metrics) {
    const key = `${m.contentId}:${m.platform}`;
    if (!latestByContentPlatform.has(key)) latestByContentPlatform.set(key, m);
  }
  const latest = [...latestByContentPlatform.values()];

  const totals = latest.reduce((acc, m) => addMetric(acc, m), { ...EMPTY_TOTALS });

  // "As of" a cutoff: the latest snapshot per content+platform that existed
  // by that point in time, summed. Comparing "now" against "as of rangeStart"
  // gives real growth - new content within the period counts fully as growth,
  // matching how an existing post's rising likes/reach also counts as growth.
  function totalsAsOf(cutoff: Date): Totals {
    const latestPerKeyAsOf = new Map<string, (typeof metrics)[number]>();
    for (const m of metrics) {
      if (m.capturedAt > cutoff) continue;
      const key = `${m.contentId}:${m.platform}`;
      const existing = latestPerKeyAsOf.get(key);
      if (!existing || m.capturedAt > existing.capturedAt) latestPerKeyAsOf.set(key, m);
    }
    return [...latestPerKeyAsOf.values()].reduce((acc, m) => addMetric(acc, m), {
      ...EMPTY_TOTALS,
    });
  }

  const previousTotals = totalsAsOf(rangeStart);
  const growth = {
    likes: growthPercent(totals.likes, previousTotals.likes),
    comments: growthPercent(totals.comments, previousTotals.comments),
    shares: growthPercent(totals.shares, previousTotals.shares),
    reach: growthPercent(totals.reach, previousTotals.reach),
    saved: growthPercent(totals.saved, previousTotals.saved),
    videoViews: growthPercent(totals.videoViews, previousTotals.videoViews),
  };

  const byCampaign = new Map<string, { campaignId: string } & Totals>();
  const byType = new Map<ContentType, Totals>();
  for (const m of latest) {
    const campaignKey = m.content.campaignId ?? "uncategorized";
    const campaignRow = byCampaign.get(campaignKey) ?? { campaignId: campaignKey, ...EMPTY_TOTALS };
    addMetric(campaignRow, m);
    byCampaign.set(campaignKey, campaignRow);

    const typeRow = byType.get(m.content.type) ?? { ...EMPTY_TOTALS };
    addMetric(typeRow, m);
    byType.set(m.content.type, typeRow);
  }

  const perPost = latest
    .map((m) => ({
      contentId: m.content.id,
      title: m.content.title,
      type: m.content.type,
      thumbnailUrl: m.content.thumbnailUrl,
      externalUrl: m.content.externalUrl,
      likes: m.likes,
      comments: m.comments,
      shares: m.shares,
      reach: m.reach,
      saved: m.saved,
      videoViews: m.videoViews,
      interactions: m.likes + m.comments + m.shares + m.saved,
    }))
    .sort((a, b) => b.interactions - a.interactions);

  // Follower totals now, vs as of the start of the selected range.
  const followerTotals = {
    followers: socialAccounts.reduce((sum, a) => sum + (a.followersCount ?? 0), 0),
    following: socialAccounts.reduce((sum, a) => sum + (a.followingCount ?? 0), 0),
  };

  function followersAsOf(cutoff: Date) {
    const latestPerAccount = new Map<string, (typeof accountSnapshots)[number]>();
    for (const snap of accountSnapshots) {
      if (snap.capturedAt > cutoff) continue;
      const existing = latestPerAccount.get(snap.socialAccountId);
      if (!existing || snap.capturedAt > existing.capturedAt) {
        latestPerAccount.set(snap.socialAccountId, snap);
      }
    }
    return {
      followers: [...latestPerAccount.values()].reduce((sum, s) => sum + s.followersCount, 0),
      following: [...latestPerAccount.values()].reduce((sum, s) => sum + s.followingCount, 0),
    };
  }

  const previousFollowerTotals = followersAsOf(rangeStart);
  const followerGrowth = {
    followers: growthPercent(followerTotals.followers, previousFollowerTotals.followers),
    following: growthPercent(followerTotals.following, previousFollowerTotals.following),
  };

  return {
    totals,
    growth,
    byCampaign: [...byCampaign.values()],
    byType: [...byType.entries()].map(([type, row]) => ({ type, ...row })),
    perPost,
    hasAnyMetrics: latest.length > 0,
    followerTotals,
    followerGrowth,
    hasAnyAccounts: socialAccounts.length > 0,
  };
}

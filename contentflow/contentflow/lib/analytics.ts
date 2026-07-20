import { prisma } from "@/lib/db";
import type { ContentType, SocialPlatform } from "@/lib/generated/prisma/enums";
import type { ResolvedRange } from "@/lib/date-range";

const EMPTY_TOTALS = {
  likes: 0,
  comments: 0,
  shares: 0,
  reach: 0,
  saved: 0,
  videoViews: 0,
  impressions: 0,
  replies: 0,
  exits: 0,
  tapsForward: 0,
};

type Totals = typeof EMPTY_TOTALS;

function addMetric<T extends Totals>(acc: T, m: Totals) {
  acc.likes += m.likes;
  acc.comments += m.comments;
  acc.shares += m.shares;
  acc.reach += m.reach;
  acc.saved += m.saved;
  acc.videoViews += m.videoViews;
  acc.impressions += m.impressions;
  acc.replies += m.replies;
  acc.exits += m.exits;
  acc.tapsForward += m.tapsForward;
  return acc;
}

function interactionsOf(m: Totals) {
  return m.likes + m.comments + m.shares + m.saved + m.replies;
}

/** Interactions / views (video plays, else impressions, else reach) - null when there's nothing to divide by. */
function engagementRateByViews(interactions: number, m: Totals): number | null {
  const views = m.videoViews || m.impressions || m.reach;
  return views > 0 ? (interactions / views) * 100 : null;
}

/** % change vs the previous value; null when there's no baseline to compare against ("new"). */
function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getAnalyticsData(
  brandId: string,
  range: ResolvedRange,
  platform?: SocialPlatform
) {
  const { start, end } = range;

  // Always fetched unscoped by platform - the account switcher filters what's
  // *displayed*, but the Instagram-vs-TikTok comparison below needs every
  // connected platform's data regardless of which one is currently selected.
  const [metrics, socialAccounts, accountSnapshots] = await Promise.all([
    prisma.metric.findMany({
      where: { content: { brandId } },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            campaignId: true,
            campaign: { select: { name: true } },
            type: true,
            thumbnailUrl: true,
            externalUrl: true,
            publishedAt: true,
            mentions: true,
            locationName: true,
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

  // Everything below scopes to posts *published* within the selected window -
  // picking a range should actually change what you see, not just the growth
  // badges next to an unbounded lifetime total.
  const inRangeAll = latest.filter(
    (m) => m.content.publishedAt && m.content.publishedAt >= start && m.content.publishedAt <= end
  );
  const inRange = platform ? inRangeAll.filter((m) => m.platform === platform) : inRangeAll;

  const totals = inRange.reduce((acc, m) => addMetric(acc, m), { ...EMPTY_TOTALS });
  const totalInteractions = interactionsOf(totals);

  // Period-over-period: the same-length window immediately before this one,
  // so growth answers "vs the equivalent previous period" rather than an
  // arbitrary lifetime-cumulative comparison.
  const periodMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - periodMs);
  const previousInRangeAll = latest.filter(
    (m) => m.content.publishedAt && m.content.publishedAt >= prevStart && m.content.publishedAt <= prevEnd
  );
  const previousInRange = platform
    ? previousInRangeAll.filter((m) => m.platform === platform)
    : previousInRangeAll;
  const previousTotals = previousInRange.reduce((acc, m) => addMetric(acc, m), { ...EMPTY_TOTALS });

  const growth = {
    likes: growthPercent(totals.likes, previousTotals.likes),
    comments: growthPercent(totals.comments, previousTotals.comments),
    shares: growthPercent(totals.shares, previousTotals.shares),
    reach: growthPercent(totals.reach, previousTotals.reach),
    saved: growthPercent(totals.saved, previousTotals.saved),
    videoViews: growthPercent(totals.videoViews, previousTotals.videoViews),
    impressions: growthPercent(totals.impressions, previousTotals.impressions),
    replies: growthPercent(totals.replies, previousTotals.replies),
    exits: growthPercent(totals.exits, previousTotals.exits),
    tapsForward: growthPercent(totals.tapsForward, previousTotals.tapsForward),
  };

  const byCampaign = new Map<string, { campaignId: string; campaignName: string | null } & Totals>();
  const byType = new Map<ContentType, Totals>();
  for (const m of inRange) {
    const campaignKey = m.content.campaignId ?? "uncategorized";
    const campaignRow = byCampaign.get(campaignKey) ?? {
      campaignId: campaignKey,
      campaignName: m.content.campaign?.name ?? null,
      ...EMPTY_TOTALS,
    };
    addMetric(campaignRow, m);
    byCampaign.set(campaignKey, campaignRow);

    const typeRow = byType.get(m.content.type) ?? { ...EMPTY_TOTALS };
    addMetric(typeRow, m);
    byType.set(m.content.type, typeRow);
  }

  // Always all platforms - powers the Instagram-vs-TikTok comparison chart,
  // which stays visible regardless of what the account switcher has selected.
  const byPlatformAccounts = new Map<SocialPlatform, { followers: number; following: number }>();
  for (const a of socialAccounts) {
    const row = byPlatformAccounts.get(a.platform) ?? { followers: 0, following: 0 };
    row.followers += a.followersCount ?? 0;
    row.following += a.followingCount ?? 0;
    byPlatformAccounts.set(a.platform, row);
  }
  const byPlatformMetrics = new Map<SocialPlatform, Totals>();
  for (const m of inRangeAll) {
    const row = byPlatformMetrics.get(m.platform) ?? { ...EMPTY_TOTALS };
    addMetric(row, m);
    byPlatformMetrics.set(m.platform, row);
  }
  const platformsPresent = new Set([...byPlatformAccounts.keys(), ...byPlatformMetrics.keys()]);
  const byPlatform = [...platformsPresent].map((p) => {
    const m = byPlatformMetrics.get(p) ?? { ...EMPTY_TOTALS };
    return {
      platform: p,
      followers: byPlatformAccounts.get(p)?.followers ?? 0,
      following: byPlatformAccounts.get(p)?.following ?? 0,
      interactions: interactionsOf(m),
      reach: m.reach,
      videoViews: m.videoViews,
    };
  });

  function followersAsOf(cutoff: Date, snapshots: typeof accountSnapshots) {
    const latestPerAccount = new Map<string, (typeof accountSnapshots)[number]>();
    for (const snap of snapshots) {
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

  const filteredAccounts = platform ? socialAccounts.filter((a) => a.platform === platform) : socialAccounts;
  const filteredAccountIds = new Set(filteredAccounts.map((a) => a.id));
  const filteredSnapshots = platform
    ? accountSnapshots.filter((s) => filteredAccountIds.has(s.socialAccountId))
    : accountSnapshots;

  const liveFollowerTotals = {
    followers: filteredAccounts.reduce((sum, a) => sum + (a.followersCount ?? 0), 0),
    following: filteredAccounts.reduce((sum, a) => sum + (a.followingCount ?? 0), 0),
  };

  // Preset ranges always end "now", so the live cached count (refreshed on
  // every sync) is more current than the last snapshot might be. A custom
  // range can end in the past, where the as-of-that-date snapshot is the
  // historically correct value - falling back to live only if no snapshot
  // exists yet at all.
  const followersAtEnd = followersAsOf(end, filteredSnapshots);
  const followerTotals =
    range.key === "custom"
      ? {
          followers: followersAtEnd.followers || liveFollowerTotals.followers,
          following: followersAtEnd.following || liveFollowerTotals.following,
        }
      : liveFollowerTotals;

  const perPost = inRange
    .map((m) => {
      const interactions = interactionsOf(m);
      return {
        contentId: m.content.id,
        title: m.content.title,
        type: m.content.type,
        thumbnailUrl: m.content.thumbnailUrl,
        externalUrl: m.content.externalUrl,
        mentions: m.content.mentions,
        locationName: m.content.locationName,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        reach: m.reach,
        saved: m.saved,
        videoViews: m.videoViews,
        impressions: m.impressions,
        replies: m.replies,
        exits: m.exits,
        tapsForward: m.tapsForward,
        interactions,
        engagementRateByFollowers:
          followerTotals.followers > 0 ? (interactions / followerTotals.followers) * 100 : null,
        engagementRateByViews: engagementRateByViews(interactions, m),
      };
    })
    .sort((a, b) => b.interactions - a.interactions);

  const previousFollowerTotals = followersAsOf(start, filteredSnapshots);
  const followerGrowth = {
    followers: growthPercent(followerTotals.followers, previousFollowerTotals.followers),
    following: growthPercent(followerTotals.following, previousFollowerTotals.following),
  };

  // Averaged per-post, not "total interactions across every post ever synced /
  // current followers" - that would inflate with every additional post synced
  // rather than reflecting how engaging a typical post actually is.
  const perPostFollowerRates = perPost
    .map((p) => p.engagementRateByFollowers)
    .filter((v): v is number => v !== null);

  const engagementRates = {
    byFollowers:
      perPostFollowerRates.length > 0
        ? perPostFollowerRates.reduce((sum, v) => sum + v, 0) / perPostFollowerRates.length
        : null,
    byViews: engagementRateByViews(totalInteractions, totals),
  };

  // Day-bucketed series over the selected range, scoped to whichever
  // platform (or all) the switcher currently has selected - same bucketing
  // rule the Dashboard's charts use (latest snapshot/metric per day, summed).
  const latestSnapshotPerAccountDay = new Map<string, (typeof filteredSnapshots)[number]>();
  for (const snap of filteredSnapshots) {
    if (snap.capturedAt < start || snap.capturedAt > end) continue;
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

  const engagementByDay = new Map<string, number>();
  for (const m of inRange) {
    if (!m.content.publishedAt) continue;
    const key = dayKey(m.content.publishedAt);
    engagementByDay.set(key, (engagementByDay.get(key) ?? 0) + interactionsOf(m));
  }
  const engagementSeries = [...engagementByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, interactions]) => ({ label: day, value: interactions }));

  return {
    totals,
    growth,
    byCampaign: [...byCampaign.values()],
    byType: [...byType.entries()].map(([type, row]) => ({ type, ...row })),
    byPlatform,
    perPost,
    hasAnyMetrics: inRange.length > 0,
    followerTotals,
    followerGrowth,
    hasAnyAccounts: socialAccounts.length > 0,
    engagementRates,
    followerSeries,
    engagementSeries,
  };
}

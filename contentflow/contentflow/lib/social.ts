import { prisma } from "@/lib/db";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

export function getSocialAccountsForBrand(brandId: string) {
  return prisma.socialAccount.findMany({ where: { brandId } });
}

/**
 * Starter is capped at one connected account (Instagram or TikTok) for the
 * whole workspace, not per-brand, so this counts across every brand under
 * it - a Starter workspace with 3 brands still can't connect 3 accounts.
 */
export function getConnectedSocialAccountCount(workspaceId: string, excludePlatform?: SocialPlatform) {
  return prisma.socialAccount.count({
    where: {
      status: "connected",
      brand: { workspaceId },
      ...(excludePlatform ? { platform: { not: excludePlatform } } : {}),
    },
  });
}

const EMPTY_PLATFORM_TOTALS = {
  posts: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saved: 0,
  videoViews: 0,
  reach: 0,
};

export async function getSocialHubData(brandId: string) {
  const accounts = await getSocialAccountsForBrand(brandId);

  const metrics = await prisma.metric.findMany({
    where: { content: { brandId } },
    orderBy: { capturedAt: "desc" },
  });

  // One snapshot per sync, so only the latest per content+platform counts.
  const latestByContentPlatform = new Map<string, (typeof metrics)[number]>();
  for (const m of metrics) {
    const key = `${m.contentId}:${m.platform}`;
    if (!latestByContentPlatform.has(key)) latestByContentPlatform.set(key, m);
  }

  const byPlatform = new Map<SocialPlatform, typeof EMPTY_PLATFORM_TOTALS>();
  for (const m of latestByContentPlatform.values()) {
    const row = byPlatform.get(m.platform) ?? { ...EMPTY_PLATFORM_TOTALS };
    row.posts += 1;
    row.likes += m.likes;
    row.comments += m.comments;
    row.shares += m.shares;
    row.saved += m.saved;
    row.videoViews += m.videoViews;
    row.reach += m.reach;
    byPlatform.set(m.platform, row);
  }

  const platformTotals = [...byPlatform.entries()].map(([platform, row]) => ({
    platform,
    ...row,
    interactions: row.likes + row.comments + row.shares + row.saved,
  }));

  const totals = {
    followers: accounts.reduce((sum, a) => sum + (a.followersCount ?? 0), 0),
    following: accounts.reduce((sum, a) => sum + (a.followingCount ?? 0), 0),
    posts: platformTotals.reduce((sum, row) => sum + row.posts, 0),
    interactions: platformTotals.reduce((sum, row) => sum + row.interactions, 0),
    comments: platformTotals.reduce((sum, row) => sum + row.comments, 0),
    videoViews: platformTotals.reduce((sum, row) => sum + row.videoViews, 0),
    likes: platformTotals.reduce((sum, row) => sum + row.likes, 0),
    reach: platformTotals.reduce((sum, row) => sum + row.reach, 0),
  };

  // Lifetime interactions per follower, across every synced post - null
  // (not zero) when there's no follower count to divide by, so the UI can
  // show "not enough data" instead of a misleading 0%.
  const engagementRate =
    totals.followers > 0 ? (totals.interactions / totals.followers) * 100 : null;

  return { accounts, platformTotals, totals, engagementRate };
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Follower count per platform, bucketed by day, for the multi-line "Follower
 * Growth by Platform" chart - only platforms with at least one synced
 * snapshot show up, so a never-connected platform doesn't draw a fake flat
 * line at zero.
 */
export async function getFollowerGrowthByPlatform(brandId: string, days = 120) {
  const accounts = await getSocialAccountsForBrand(brandId);
  if (accounts.length === 0) return [];

  const platformByAccountId = new Map(accounts.map((a) => [a.id, a.platform]));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const snapshots = await prisma.accountSnapshot.findMany({
    where: { socialAccountId: { in: accounts.map((a) => a.id) }, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
  });

  // Snapshots are ordered oldest-first, so the last write per account+day
  // wins - that's the latest snapshot captured that day.
  const latestPerAccountDay = new Map<string, (typeof snapshots)[number]>();
  for (const snap of snapshots) {
    latestPerAccountDay.set(`${snap.socialAccountId}:${dayKey(snap.capturedAt)}`, snap);
  }

  const byPlatformDay = new Map<SocialPlatform, Map<string, number>>();
  for (const snap of latestPerAccountDay.values()) {
    const platform = platformByAccountId.get(snap.socialAccountId);
    if (!platform) continue;
    const dayMap = byPlatformDay.get(platform) ?? new Map<string, number>();
    const day = dayKey(snap.capturedAt);
    dayMap.set(day, (dayMap.get(day) ?? 0) + snap.followersCount);
    byPlatformDay.set(platform, dayMap);
  }

  return [...byPlatformDay.entries()].map(([platform, dayMap]) => ({
    platform,
    series: [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, value]) => ({ label: day, value })),
  }));
}

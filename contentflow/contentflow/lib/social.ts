import { prisma } from "@/lib/db";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

export function getSocialAccountsForBrand(brandId: string) {
  return prisma.socialAccount.findMany({ where: { brandId } });
}

const EMPTY_PLATFORM_TOTALS = {
  posts: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  saved: 0,
  videoViews: 0,
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
  };

  return { accounts, platformTotals, totals };
}

import { prisma } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;

function interactionsOf(m: { likes: number; comments: number; shares: number; saved: number; replies: number }) {
  return m.likes + m.comments + m.shares + m.saved + m.replies;
}

/**
 * One row per brand in this workspace, aggregating what an agency needs at a
 * glance: followers across connected accounts, posts and campaigns run, and
 * interactions over the trailing 30 days - real synced data only, same
 * source tables as Analytics/Dashboard.
 */
export async function getAgencyRoster(workspaceId: string) {
  const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS);

  const brands = await prisma.brand.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    include: {
      socialAccounts: true,
      _count: { select: { content: true, campaigns: true } },
    },
  });

  // Pull the latest-per-content metric row within the window, per brand, the
  // same "latest snapshot" rule used everywhere else metrics are summed.
  const recentMetrics = await prisma.metric.findMany({
    where: { content: { brandId: { in: brands.map((b) => b.id) } }, capturedAt: { gte: since } },
    include: { content: { select: { brandId: true } } },
    orderBy: { capturedAt: "desc" },
  });
  const latestPerContent = new Map<string, (typeof recentMetrics)[number]>();
  for (const m of recentMetrics) {
    if (!latestPerContent.has(m.contentId)) latestPerContent.set(m.contentId, m);
  }
  const interactionsByBrand = new Map<string, number>();
  for (const m of latestPerContent.values()) {
    const brandId = m.content.brandId;
    interactionsByBrand.set(brandId, (interactionsByBrand.get(brandId) ?? 0) + interactionsOf(m));
  }

  return brands.map((b) => ({
    id: b.id,
    name: b.name,
    followers: b.socialAccounts.reduce((sum, a) => sum + (a.followersCount ?? 0), 0),
    connectedAccounts: b.socialAccounts.length,
    postsCount: b._count.content,
    campaignsCount: b._count.campaigns,
    interactions30d: interactionsByBrand.get(b.id) ?? 0,
  }));
}

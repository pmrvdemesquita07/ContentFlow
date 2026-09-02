import { prisma } from "@/lib/db";
import { interactionsOf, latestSnapshotPerPlatform } from "@/lib/metrics";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;

/**
 * One row per brand in this workspace, aggregating what an agency needs at a
 * glance: followers across connected accounts, published content, campaigns
 * run, and interactions on content published in the trailing 30 days - real
 * synced data only, on the same counting rules as Analytics/Dashboard.
 */
export async function getAgencyRoster(workspaceId: string) {
  const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS);

  const brands = await prisma.brand.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    include: {
      socialAccounts: true,
      // Counted on `status`, not every row: `content` also holds ideas and
      // drafts, so a brand with a full ideas bank and nothing shipped would
      // otherwise read as its most productive one.
      _count: {
        select: { content: { where: { status: "published" } }, campaigns: true },
      },
    },
  });

  // Windowed by when the content was *published*, not when we happened to
  // sync it: filtering on capturedAt made this "interactions on whatever got
  // re-synced this month" - every post ever if a sync ran, zero if none did.
  const recentContent = await prisma.content.findMany({
    where: {
      brandId: { in: brands.map((b) => b.id) },
      publishedAt: { gte: since },
    },
    select: { brandId: true, metrics: true },
  });

  const interactionsByBrand = new Map<string, number>();
  for (const content of recentContent) {
    // Latest snapshot per platform - metric rows are cumulative, one per sync,
    // so summing the history multiplies by however many times we've synced.
    const interactions = latestSnapshotPerPlatform(content.metrics).reduce(
      (sum, m) => sum + interactionsOf(m),
      0
    );
    interactionsByBrand.set(
      content.brandId,
      (interactionsByBrand.get(content.brandId) ?? 0) + interactions
    );
  }

  return brands.map((b) => ({
    id: b.id,
    name: b.name,
    followers: b.socialAccounts.reduce((sum, a) => sum + (a.followersCount ?? 0), 0),
    connectedAccounts: b.socialAccounts.length,
    publishedCount: b._count.content,
    campaignsCount: b._count.campaigns,
    interactions30d: interactionsByBrand.get(b.id) ?? 0,
  }));
}

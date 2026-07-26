import { prisma } from "@/lib/db";

export function getDiscoveryProfile(workspaceId: string) {
  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      discoverable: true,
      discoveryNiche: true,
      discoveryBio: true,
      discoveryContactEmail: true,
    },
  });
}

/**
 * Creator workspaces that opted in to the marketplace - only ever projects
 * what the creator published in their discovery profile plus the
 * handle/follower counts their own connected accounts already made public
 * by syncing (never tokens, never anything else tenant-scoped). This is the
 * one intentional cross-tenant read in the app; every other query here is
 * scoped to the caller's own workspace.
 */
export async function getDiscoverableCreators(niche?: string) {
  const workspaces = await prisma.workspace.findMany({
    where: {
      type: "creator",
      discoverable: true,
      archivedAt: null,
      ...(niche ? { discoveryNiche: { contains: niche, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      discoveryNiche: true,
      discoveryBio: true,
      discoveryContactEmail: true,
      brands: {
        select: {
          socialAccounts: {
            where: { status: "connected" },
            select: { platform: true, externalUsername: true, followersCount: true },
          },
        },
      },
    },
  });

  // One query across every discoverable creator, rather than one per row -
  // ratings are agency-authored reviews on contracts whose Creator record
  // traces back to that creator's own workspace (see Review's schema
  // comment for why the reviewee is implicit from reviewerRole).
  const reviewRows = await prisma.review.findMany({
    where: { reviewerRole: "agency", contract: { creator: { sourceWorkspaceId: { not: null } } } },
    select: { rating: true, contract: { select: { creator: { select: { sourceWorkspaceId: true } } } } },
  });
  const ratings = new Map<string, number[]>();
  for (const row of reviewRows) {
    const wsId = row.contract.creator.sourceWorkspaceId;
    if (!wsId) continue;
    const list = ratings.get(wsId) ?? [];
    list.push(row.rating);
    ratings.set(wsId, list);
  }

  return workspaces.map((w) => {
    const ratingList = ratings.get(w.id) ?? [];
    return {
      id: w.id,
      name: w.name,
      niche: w.discoveryNiche,
      bio: w.discoveryBio,
      contactEmail: w.discoveryContactEmail,
      accounts: w.brands.flatMap((b) => b.socialAccounts),
      averageRating: ratingList.length
        ? ratingList.reduce((sum, r) => sum + r, 0) / ratingList.length
        : null,
      ratingCount: ratingList.length,
    };
  });
}

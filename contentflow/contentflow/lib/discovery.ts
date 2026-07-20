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

  return workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    niche: w.discoveryNiche,
    bio: w.discoveryBio,
    contactEmail: w.discoveryContactEmail,
    accounts: w.brands.flatMap((b) => b.socialAccounts),
  }));
}

import { prisma } from "@/lib/db";

/** A brand/agency's own posted briefs, with how many creators have applied. */
export function getOpportunitiesForWorkspace(workspaceId: string) {
  return prisma.opportunity.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { matches: true } } },
  });
}

export async function getOpportunityDetail(opportunityId: string, workspaceId: string) {
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: opportunityId, workspaceId },
    include: {
      matches: {
        orderBy: { createdAt: "asc" },
        include: {
          creatorWorkspace: {
            select: {
              id: true,
              name: true,
              discoveryNiche: true,
              discoveryBio: true,
              discoveryContactEmail: true,
            },
          },
        },
      },
    },
  });
  return opportunity;
}

/** Open briefs any creator can browse - across every brand/agency workspace. */
export function getOpenOpportunities(niche?: string) {
  return prisma.opportunity.findMany({
    where: {
      status: "open",
      ...(niche ? { niche: { contains: niche, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { workspace: { select: { id: true, name: true } } },
  });
}

/** A creator workspace's own applications, across every opportunity. */
export function getMatchesForCreatorWorkspace(creatorWorkspaceId: string) {
  return prisma.match.findMany({
    where: { creatorWorkspaceId },
    orderBy: { createdAt: "desc" },
    include: {
      opportunity: { include: { workspace: { select: { id: true, name: true } } } },
    },
  });
}

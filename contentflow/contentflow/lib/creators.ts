import { prisma } from "@/lib/db";

export function getCreatorsForWorkspace(workspaceId: string) {
  return prisma.creator.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { campaigns: { include: { campaign: { select: { id: true, name: true } } } } },
  });
}

export function getCreatorsForCampaign(campaignId: string) {
  return prisma.campaignCreator.findMany({
    where: { campaignId },
    orderBy: { createdAt: "asc" },
    include: { creator: true },
  });
}

/** Creators in the workspace not yet attached to this campaign - candidates for the assign form. */
export async function getUnassignedCreators(workspaceId: string, campaignId: string) {
  const all = await prisma.creator.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  });
  const assigned = await prisma.campaignCreator.findMany({
    where: { campaignId },
    select: { creatorId: true },
  });
  const assignedIds = new Set(assigned.map((a) => a.creatorId));
  return all.filter((c) => !assignedIds.has(c.id));
}

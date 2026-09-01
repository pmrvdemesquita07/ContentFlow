import { prisma } from "@/lib/db";

export function getContractsForWorkspace(workspaceId: string) {
  return prisma.contract.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      payments: true,
    },
  });
}

export function getContractDetail(contractId: string, workspaceId: string) {
  return prisma.contract.findFirst({
    where: { id: contractId, workspaceId },
    include: {
      creator: true,
      campaign: { select: { id: true, name: true } },
      payments: { orderBy: { createdAt: "asc" } },
      reviews: true,
    },
  });
}

/** A creator workspace's own contracts - only ones auto-linked via an
 * accepted marketplace Match (Creator.sourceWorkspaceId), never an agency's
 * hand-entered roster contact that happens to share a name. */
export function getContractsForCreatorWorkspace(creatorWorkspaceId: string) {
  return prisma.contract.findMany({
    where: { creator: { sourceWorkspaceId: creatorWorkspaceId } },
    orderBy: { createdAt: "desc" },
    include: {
      workspace: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      reviews: true,
    },
  });
}

export function getContractDetailForCreator(contractId: string, creatorWorkspaceId: string) {
  return prisma.contract.findFirst({
    where: { id: contractId, creator: { sourceWorkspaceId: creatorWorkspaceId } },
    include: {
      workspace: { select: { id: true, name: true } },
      campaign: { select: { id: true, name: true } },
      reviews: true,
    },
  });
}

export function getCreatorsForWorkspaceOptions(workspaceId: string) {
  return prisma.creator.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function getCampaignsForWorkspaceOptions(workspaceId: string) {
  return prisma.campaign.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function getContractsForWorkspaceOptions(workspaceId: string) {
  return prisma.contract.findMany({
    where: { workspaceId },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });
}

export function paidTotal(payments: { amount: unknown; status: string }[]) {
  return payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

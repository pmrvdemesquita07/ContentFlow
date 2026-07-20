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

export function paidTotal(payments: { amount: unknown; status: string }[]) {
  return payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

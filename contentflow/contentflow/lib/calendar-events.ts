import { prisma } from "@/lib/db";
import type { CalendarEventType } from "@/lib/generated/prisma/enums";

const WITH_RELATIONS = {
  include: {
    campaign: { select: { id: true, name: true } },
    contract: { select: { id: true, title: true } },
    creator: { select: { id: true, name: true } },
    content: { select: { id: true, title: true, type: true, platforms: true } },
  },
} as const;

export type CalendarEventFilters = {
  type?: CalendarEventType;
  creatorId?: string;
  campaignId?: string;
  from?: Date;
  to?: Date;
};

function dateWhere(filters: CalendarEventFilters) {
  const { from, to } = filters;
  if (!from && !to) return {};
  return { startAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } };
}

/** Approval deadlines and manual reminders for one brand - not publish dates (see Content.scheduledAt for those). */
export function getCalendarEvents(brandId: string, filters: CalendarEventFilters = {}) {
  const { type, creatorId, campaignId } = filters;
  return prisma.calendarEvent.findMany({
    where: {
      brandId,
      ...(type ? { type } : {}),
      ...(creatorId ? { creatorId } : {}),
      ...(campaignId ? { campaignId } : {}),
      ...dateWhere(filters),
    },
    orderBy: { startAt: "asc" },
    ...WITH_RELATIONS,
  });
}

/** Studio-only aggregate across every brand in the workspace - same rows, no brandId filter. */
export function getWorkspaceCalendarEvents(workspaceId: string, filters: CalendarEventFilters = {}) {
  const { type, creatorId, campaignId } = filters;
  return prisma.calendarEvent.findMany({
    where: {
      workspaceId,
      ...(type ? { type } : {}),
      ...(creatorId ? { creatorId } : {}),
      ...(campaignId ? { campaignId } : {}),
      ...dateWhere(filters),
    },
    orderBy: { startAt: "asc" },
    ...WITH_RELATIONS,
    include: { ...WITH_RELATIONS.include, brand: { select: { id: true, name: true } } },
  });
}

export type ContractDeadline = {
  contractId: string;
  title: string;
  creatorId: string;
  creatorName: string;
  campaignId: string | null;
  kind: "start" | "end";
  date: Date;
};

/**
 * Contract.startDate/endDate themselves, read directly - never copied into
 * CalendarEvent rows, so there's exactly one place a contract's dates live.
 * Contracts are workspace-level and only sometimes tied to a campaign (a
 * creator can be under a broader retainer with no campaign at all) - a
 * single brand's calendar can only show the ones tied to one of its
 * campaigns; campaign-less contracts only surface in the workspace-wide
 * (Studio) view below.
 */
export async function getContractDeadlines(brandId: string): Promise<ContractDeadline[]> {
  const contracts = await prisma.contract.findMany({
    where: { campaign: { brandId } },
    select: { id: true, title: true, startDate: true, endDate: true, campaignId: true, creator: { select: { id: true, name: true } } },
  });
  return contractsToDeadlines(contracts);
}

export async function getWorkspaceContractDeadlines(workspaceId: string): Promise<ContractDeadline[]> {
  const contracts = await prisma.contract.findMany({
    where: { workspaceId },
    select: { id: true, title: true, startDate: true, endDate: true, campaignId: true, creator: { select: { id: true, name: true } } },
  });
  return contractsToDeadlines(contracts);
}

function contractsToDeadlines(
  contracts: Array<{
    id: string;
    title: string;
    startDate: Date | null;
    endDate: Date | null;
    campaignId: string | null;
    creator: { id: string; name: string };
  }>
): ContractDeadline[] {
  const out: ContractDeadline[] = [];
  for (const c of contracts) {
    if (c.startDate) {
      out.push({ contractId: c.id, title: c.title, creatorId: c.creator.id, creatorName: c.creator.name, campaignId: c.campaignId, kind: "start", date: c.startDate });
    }
    if (c.endDate) {
      out.push({ contractId: c.id, title: c.title, creatorId: c.creator.id, creatorName: c.creator.name, campaignId: c.campaignId, kind: "end", date: c.endDate });
    }
  }
  return out;
}

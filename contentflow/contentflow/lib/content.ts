import { prisma } from "@/lib/db";
import type { ContentStatus, ContentType, SocialPlatform } from "@/lib/generated/prisma/enums";

const WITH_RELATIONS = {
  include: {
    tasks: { orderBy: { createdAt: "asc" } },
    media: true,
    metrics: { orderBy: { capturedAt: "desc" }, take: 1 },
  },
} as const;

export function getContentByStatuses(brandId: string, statuses: ContentStatus[]) {
  return prisma.content.findMany({
    where: { brandId, status: { in: statuses } },
    orderBy: { updatedAt: "desc" },
    ...WITH_RELATIONS,
  });
}

/** Ideas Bank: same "idea" rows as getContentByStatuses, plus the link preview (if captured from a URL). */
export function getIdeas(brandId: string) {
  return prisma.content.findMany({
    where: { brandId, status: "idea" },
    orderBy: { updatedAt: "desc" },
    include: { ...WITH_RELATIONS.include, ideaSource: true },
  });
}

export type ContentFilters = {
  statuses: ContentStatus[];
  /** Format (post/story/reel/video/carousel); omit for every format. */
  type?: ContentType;
  /** A specific campaign id, "none" for content with no campaign, or omit for either. */
  campaignId?: string | "none";
  /** Matches content whose publishedAt OR scheduledAt falls in [from, to]. */
  from?: Date;
  to?: Date;
};

/** Posts/Campaigns-list filtering: any combination of status, format, campaign and date range. */
export function getFilteredContent(brandId: string, filters: ContentFilters) {
  const { statuses, type, campaignId, from, to } = filters;
  const dateBounds = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  return prisma.content.findMany({
    where: {
      brandId,
      status: { in: statuses },
      ...(type ? { type } : {}),
      ...(campaignId === "none" ? { campaignId: null } : campaignId ? { campaignId } : {}),
      ...(from || to
        ? { OR: [{ publishedAt: dateBounds }, { scheduledAt: dateBounds }] }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    ...WITH_RELATIONS,
  });
}

export function getContentById(id: string, brandId: string) {
  return prisma.content.findFirst({
    where: { id, brandId },
    ...WITH_RELATIONS,
  });
}

export function getScheduledContent(brandId: string) {
  return prisma.content.findMany({
    where: { brandId, scheduledAt: { not: null } },
    orderBy: { scheduledAt: "asc" },
    ...WITH_RELATIONS,
  });
}

/** Social Hub's "Auto-Repost" tab: the upcoming queue plus a handful of recently
 * published posts, so a just-published item still shows a "Done" row instead
 * of just disappearing. */
export async function getAutoRepostQueue(brandId: string) {
  const [scheduled, done] = await Promise.all([
    prisma.content.findMany({
      where: { brandId, status: "scheduled", scheduledAt: { not: null } },
      orderBy: { scheduledAt: "asc" },
      take: 20,
      ...WITH_RELATIONS,
    }),
    prisma.content.findMany({
      where: { brandId, status: "published", publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 5,
      ...WITH_RELATIONS,
    }),
  ]);
  return { scheduled, done };
}

export type CalendarContentFilters = {
  /** Only content that has this platform among Content.platforms. */
  platform?: SocialPlatform;
  campaignId?: string;
};

/** Everything that belongs on a calendar: future scheduled posts and already-published ones. */
export function getCalendarContent(brandId: string, filters: CalendarContentFilters = {}) {
  return prisma.content.findMany({
    where: {
      brandId,
      OR: [{ scheduledAt: { not: null } }, { publishedAt: { not: null } }],
      ...(filters.platform ? { platforms: { has: filters.platform } } : {}),
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
    },
    orderBy: { publishedAt: "asc" },
    ...WITH_RELATIONS,
  });
}

/** Studio-only aggregate: the same calendar content, across every brand in the workspace. */
export function getWorkspaceCalendarContent(workspaceId: string, filters: CalendarContentFilters = {}) {
  return prisma.content.findMany({
    where: {
      workspaceId,
      OR: [{ scheduledAt: { not: null } }, { publishedAt: { not: null } }],
      ...(filters.platform ? { platforms: { has: filters.platform } } : {}),
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
    },
    orderBy: { publishedAt: "asc" },
    include: { ...WITH_RELATIONS.include, brand: { select: { id: true, name: true } } },
  });
}

export type BestPostingTimes = {
  bestDay: { day: number; avg: number; count: number };
  bestHour: { hour: number; avg: number; count: number };
  sampleSize: number;
};

/**
 * Looks at your own published posts' engagement to suggest a day-of-week and
 * hour-of-day - no external benchmarks, just your own history. Returns null
 * when there isn't enough data yet to say anything meaningful.
 */
export async function getBestPostingTimes(brandId: string): Promise<BestPostingTimes | null> {
  const content = await prisma.content.findMany({
    where: { brandId, publishedAt: { not: null }, metrics: { some: {} } },
    include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 } },
  });

  const withEngagement = content
    .map((c) => {
      const m = c.metrics[0];
      if (!m || !c.publishedAt) return null;
      return {
        publishedAt: c.publishedAt,
        interactions: m.likes + m.comments + m.shares + m.saved + m.replies,
      };
    })
    .filter((x): x is { publishedAt: Date; interactions: number } => x !== null);

  if (withEngagement.length < 3) return null;

  const byDay = new Map<number, { total: number; count: number }>();
  const byHour = new Map<number, { total: number; count: number }>();
  for (const { publishedAt, interactions } of withEngagement) {
    const dayRow = byDay.get(publishedAt.getDay()) ?? { total: 0, count: 0 };
    dayRow.total += interactions;
    dayRow.count += 1;
    byDay.set(publishedAt.getDay(), dayRow);

    const hourRow = byHour.get(publishedAt.getHours()) ?? { total: 0, count: 0 };
    hourRow.total += interactions;
    hourRow.count += 1;
    byHour.set(publishedAt.getHours(), hourRow);
  }

  const bestDay = [...byDay.entries()]
    .map(([day, { total, count }]) => ({ day, avg: total / count, count }))
    .sort((a, b) => b.avg - a.avg)[0];
  const bestHour = [...byHour.entries()]
    .map(([hour, { total, count }]) => ({ hour, avg: total / count, count }))
    .sort((a, b) => b.avg - a.avg)[0];

  return { bestDay, bestHour, sampleSize: withEngagement.length };
}

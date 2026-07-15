import { prisma } from "@/lib/db";
import type { ContentType } from "@/lib/generated/prisma/enums";

const EMPTY_TOTALS = { likes: 0, comments: 0, shares: 0, reach: 0, saved: 0, videoViews: 0 };

function addMetric<T extends typeof EMPTY_TOTALS>(acc: T, m: typeof EMPTY_TOTALS) {
  acc.likes += m.likes;
  acc.comments += m.comments;
  acc.shares += m.shares;
  acc.reach += m.reach;
  acc.saved += m.saved;
  acc.videoViews += m.videoViews;
  return acc;
}

export async function getAnalyticsData(brandId: string) {
  const metrics = await prisma.metric.findMany({
    where: { content: { brandId } },
    include: {
      content: {
        select: {
          id: true,
          title: true,
          campaignId: true,
          type: true,
          thumbnailUrl: true,
          externalUrl: true,
        },
      },
    },
    orderBy: { capturedAt: "desc" },
  });

  // Metric rows are snapshots over time (one per sync), so only the most
  // recent snapshot per content+platform reflects current totals - summing
  // every historical row would multiply counts by however many times we've synced.
  const latestByContentPlatform = new Map<string, (typeof metrics)[number]>();
  for (const m of metrics) {
    const key = `${m.contentId}:${m.platform}`;
    if (!latestByContentPlatform.has(key)) latestByContentPlatform.set(key, m);
  }
  const latest = [...latestByContentPlatform.values()];

  const totals = latest.reduce((acc, m) => addMetric(acc, m), { ...EMPTY_TOTALS });

  const byCampaign = new Map<string, { campaignId: string } & typeof EMPTY_TOTALS>();
  const byType = new Map<ContentType, typeof EMPTY_TOTALS>();
  for (const m of latest) {
    const campaignKey = m.content.campaignId ?? "uncategorized";
    const campaignRow = byCampaign.get(campaignKey) ?? { campaignId: campaignKey, ...EMPTY_TOTALS };
    addMetric(campaignRow, m);
    byCampaign.set(campaignKey, campaignRow);

    const typeRow = byType.get(m.content.type) ?? { ...EMPTY_TOTALS };
    addMetric(typeRow, m);
    byType.set(m.content.type, typeRow);
  }

  const perPost = latest
    .map((m) => ({
      contentId: m.content.id,
      title: m.content.title,
      type: m.content.type,
      thumbnailUrl: m.content.thumbnailUrl,
      externalUrl: m.content.externalUrl,
      likes: m.likes,
      comments: m.comments,
      shares: m.shares,
      reach: m.reach,
      saved: m.saved,
      videoViews: m.videoViews,
      interactions: m.likes + m.comments + m.shares + m.saved,
    }))
    .sort((a, b) => b.interactions - a.interactions);

  return {
    totals,
    byCampaign: [...byCampaign.values()],
    byType: [...byType.entries()].map(([type, row]) => ({ type, ...row })),
    perPost,
    hasAnyMetrics: latest.length > 0,
  };
}

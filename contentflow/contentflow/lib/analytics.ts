import { prisma } from "@/lib/db";

export async function getAnalyticsData(brandId: string) {
  const metrics = await prisma.metric.findMany({
    where: { content: { brandId } },
    include: { content: { select: { id: true, title: true, campaignId: true } } },
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

  const totals = latest.reduce(
    (acc, m) => {
      acc.likes += m.likes;
      acc.comments += m.comments;
      acc.shares += m.shares;
      acc.reach += m.reach;
      return acc;
    },
    { likes: 0, comments: 0, shares: 0, reach: 0 }
  );

  const byCampaign = new Map<
    string,
    { campaignId: string; likes: number; comments: number; shares: number; reach: number }
  >();
  for (const m of latest) {
    const key = m.content.campaignId ?? "uncategorized";
    const row = byCampaign.get(key) ?? {
      campaignId: key,
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
    };
    row.likes += m.likes;
    row.comments += m.comments;
    row.shares += m.shares;
    row.reach += m.reach;
    byCampaign.set(key, row);
  }

  return {
    totals,
    byCampaign: [...byCampaign.values()],
    hasAnyMetrics: latest.length > 0,
  };
}

import { prisma } from "@/lib/db";

export async function getAnalyticsData(brandId: string) {
  const metrics = await prisma.metric.findMany({
    where: { content: { brandId } },
    include: { content: { select: { id: true, title: true, campaignId: true } } },
    orderBy: { capturedAt: "desc" },
  });

  const totals = metrics.reduce(
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
  for (const m of metrics) {
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
    hasAnyMetrics: metrics.length > 0,
  };
}

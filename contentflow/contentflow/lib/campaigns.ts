import { prisma } from "@/lib/db";

export function interactionsOf(m: { likes: number; comments: number; shares: number; saved: number; replies: number }) {
  return m.likes + m.comments + m.shares + m.saved + m.replies;
}

/// ROI here means real cost vs real synced interactions/reach - never a
/// fabricated revenue figure, since ContentFlow has no sales/e-commerce
/// integration to know what a post actually generated in revenue.
export function roiOf(budget: number | null, interactions: number, reach: number) {
  if (budget === null) return null;
  return {
    budget,
    costPerInteraction: interactions > 0 ? budget / interactions : null,
    costPerReach: reach > 0 ? budget / reach : null,
  };
}

export async function getCampaignsForBrand(brandId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    include: {
      content: {
        include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 } },
      },
    },
  });

  return campaigns.map((c) => {
    const totals = c.content.reduce(
      (sum, item) => {
        const m = item.metrics[0];
        if (!m) return sum;
        return {
          interactions: sum.interactions + interactionsOf(m),
          reach: sum.reach + m.reach,
        };
      },
      { interactions: 0, reach: 0 }
    );
    const budget = c.budget !== null ? Number(c.budget) : null;
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      startDate: c.startDate,
      endDate: c.endDate,
      contentCount: c.content.length,
      budget,
      roi: roiOf(budget, totals.interactions, totals.reach),
      ...totals,
    };
  });
}

export async function getCampaignDetail(campaignId: string, brandId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, brandId },
    include: {
      content: {
        include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 } },
        orderBy: { updatedAt: "desc" },
      },
      media: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!campaign) return null;

  const posts = campaign.content.map((item) => {
    const m = item.metrics[0];
    const interactions = m ? interactionsOf(m) : 0;
    return {
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      thumbnailUrl: item.thumbnailUrl,
      externalUrl: item.externalUrl,
      likes: m?.likes ?? 0,
      comments: m?.comments ?? 0,
      shares: m?.shares ?? 0,
      saved: m?.saved ?? 0,
      reach: m?.reach ?? 0,
      videoViews: m?.videoViews ?? 0,
      interactions,
    };
  });

  const totals = posts.reduce(
    (sum, p) => ({
      interactions: sum.interactions + p.interactions,
      reach: sum.reach + p.reach,
      likes: sum.likes + p.likes,
      comments: sum.comments + p.comments,
    }),
    { interactions: 0, reach: 0, likes: 0, comments: 0 }
  );

  const budget = campaign.budget !== null ? Number(campaign.budget) : null;

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    budget,
    roi: roiOf(budget, totals.interactions, totals.reach),
    posts,
    totals,
    files: campaign.media,
  };
}

/** Content not yet in any campaign - candidates to add to this one. */
export function getUnassignedContent(brandId: string) {
  return prisma.content.findMany({
    where: { brandId, campaignId: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, type: true, status: true, thumbnailUrl: true },
    take: 50,
  });
}

import { prisma } from "@/lib/db";
import { interactionsOf, roiOf } from "@/lib/campaigns";

/** Existing share links for a campaign, newest first - shown on the campaign detail page. */
export function getReportsForCampaign(campaignId: string, workspaceId: string) {
  return prisma.report.findMany({
    where: { campaignId, workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

/** Standing email subscriptions for a campaign, newest first. */
export function getReportSubscriptionsForCampaign(campaignId: string, workspaceId: string) {
  return prisma.reportSubscription.findMany({
    where: { campaignId, workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * The report id is the share token - no separate field, since a Prisma
 * uuid v4 is already unguessable. Returns null for a missing or revoked
 * report so the public page can 404 either way without leaking which.
 */
export async function getPublicReportData(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      campaign: {
        include: {
          workspace: { select: { name: true } },
          content: {
            include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 } },
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  });
  if (!report || report.revokedAt) return null;

  const posts = report.campaign.content.map((item) => {
    const m = item.metrics[0];
    const interactions = m ? interactionsOf(m) : 0;
    return {
      id: item.id,
      title: item.title,
      type: item.type,
      thumbnailUrl: item.thumbnailUrl,
      likes: m?.likes ?? 0,
      comments: m?.comments ?? 0,
      reach: m?.reach ?? 0,
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

  const budget = report.campaign.budget !== null ? Number(report.campaign.budget) : null;

  return {
    campaignName: report.campaign.name,
    campaignDescription: report.campaign.description,
    workspaceName: report.campaign.workspace.name,
    generatedAt: report.createdAt,
    budget,
    roi: roiOf(budget, totals.interactions, totals.reach),
    totals,
    posts: posts.sort((a, b) => b.interactions - a.interactions),
  };
}

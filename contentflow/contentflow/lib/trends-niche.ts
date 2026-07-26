import { prisma } from "@/lib/db";
import type { ContentType } from "@/lib/generated/prisma/enums";
import type { ResolvedRange } from "@/lib/date-range";
import { getInternalTrends } from "@/lib/trends-internal";

export type NicheFormatRow = { key: ContentType; count: number; avgInteractions: number };
export type NicheHashtagRow = { key: string; count: number; avgInteractions: number };

export type NicheTrendsResult = {
  hasCompetitors: boolean;
  yourFormats: NicheFormatRow[];
  competitorFormats: { key: ContentType; count: number }[];
  yourHashtags: NicheHashtagRow[];
  competitorHashtags: { key: string; count: number }[];
};

/**
 * Cross-references manually-logged CompetitorPost entries against the
 * brand's own published posts, side by side. No invented performance
 * metric for competitors (we don't have their engagement) - just
 * frequency and format, same principle as CompetitorSnapshot.
 */
export async function getNicheTrends(
  workspaceId: string,
  brandId: string,
  range: ResolvedRange
): Promise<NicheTrendsResult> {
  const competitorCount = await prisma.competitor.count({ where: { workspaceId } });
  if (competitorCount === 0) {
    return {
      hasCompetitors: false,
      yourFormats: [],
      competitorFormats: [],
      yourHashtags: [],
      competitorHashtags: [],
    };
  }

  const [competitorPosts, internal] = await Promise.all([
    prisma.competitorPost.findMany({
      where: { competitor: { workspaceId }, observedAt: { gte: range.start, lte: range.end } },
      select: { type: true, hashtags: true },
    }),
    getInternalTrends(brandId, range),
  ]);

  const formatCounts = new Map<ContentType, number>();
  const hashtagCounts = new Map<string, number>();
  for (const p of competitorPosts) {
    formatCounts.set(p.type, (formatCounts.get(p.type) ?? 0) + 1);
    for (const tag of p.hashtags) {
      hashtagCounts.set(tag, (hashtagCounts.get(tag) ?? 0) + 1);
    }
  }

  return {
    hasCompetitors: true,
    yourFormats: [...internal.byFormat]
      .sort((a, b) => b.avgInteractions - a.avgInteractions)
      .map((r) => ({ key: r.key, count: r.count, avgInteractions: r.avgInteractions })),
    competitorFormats: [...formatCounts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count),
    yourHashtags: [...internal.byHashtag]
      .sort((a, b) => b.avgInteractions - a.avgInteractions)
      .map((r) => ({ key: r.key, count: r.count, avgInteractions: r.avgInteractions })),
    competitorHashtags: [...hashtagCounts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count),
  };
}

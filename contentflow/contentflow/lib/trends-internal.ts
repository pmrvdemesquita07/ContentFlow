import { prisma } from "@/lib/db";
import type { ContentType, SocialPlatform } from "@/lib/generated/prisma/enums";
import type { ResolvedRange } from "@/lib/date-range";
import { parseHashtags } from "@/lib/text-parse";

function interactionsOf(m: { likes: number; comments: number; shares: number; saved: number; replies: number }) {
  return m.likes + m.comments + m.shares + m.saved + m.replies;
}

/** % change vs the previous value; null when there's no baseline to compare against ("new"). */
function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

export type TrendRow<K> = { key: K; avgInteractions: number; count: number; growthPercent: number | null };

function buildTrendRows<K>(
  currentMap: Map<K, { total: number; count: number }>,
  previousMap: Map<K, { total: number; count: number }>
): TrendRow<K>[] {
  const rows = [...currentMap.entries()].map(([key, { total, count }]) => {
    const prev = previousMap.get(key);
    const prevAvg = prev ? prev.total / prev.count : 0;
    const avgInteractions = total / count;
    return { key, avgInteractions, count, growthPercent: growthPercent(avgInteractions, prevAvg) };
  });
  return rows.sort((a, b) => (b.growthPercent ?? -Infinity) - (a.growthPercent ?? -Infinity));
}

export type InternalTrendsResult = {
  sampleSize: number;
  hasEnoughData: boolean;
  byFormat: TrendRow<ContentType>[];
  byHashtag: TrendRow<string>[];
};

/**
 * Trends over the brand's own published posts - grouped by format and by
 * hashtag (parsed live from the caption, same as elsewhere in the app; no
 * stored hashtags column), each compared against the equal-length period
 * immediately before the selected range.
 */
export async function getInternalTrends(
  brandId: string,
  range: ResolvedRange,
  platform?: SocialPlatform
): Promise<InternalTrendsResult> {
  const { start, end } = range;
  const periodMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - periodMs);

  const metrics = await prisma.metric.findMany({
    where: {
      content: { brandId, publishedAt: { not: null, gte: prevStart, lte: end } },
      ...(platform ? { platform } : {}),
    },
    include: { content: { select: { id: true, type: true, body: true, publishedAt: true } } },
    orderBy: { capturedAt: "desc" },
  });

  // Latest snapshot per content+platform - Metric rows are one per sync, not
  // a running total, so summing every historical row would double count.
  const latestByContentPlatform = new Map<string, (typeof metrics)[number]>();
  for (const m of metrics) {
    const key = `${m.contentId}:${m.platform}`;
    if (!latestByContentPlatform.has(key)) latestByContentPlatform.set(key, m);
  }

  // Sum interactions across platforms per content - a format/hashtag trend is
  // about the post itself, not one connected account's share of it.
  type PostRow = { publishedAt: Date; type: ContentType; body: string | null; interactions: number };
  const byContent = new Map<string, PostRow>();
  for (const m of latestByContentPlatform.values()) {
    if (!m.content.publishedAt) continue;
    const existing = byContent.get(m.contentId) ?? {
      publishedAt: m.content.publishedAt,
      type: m.content.type,
      body: m.content.body,
      interactions: 0,
    };
    existing.interactions += interactionsOf(m);
    byContent.set(m.contentId, existing);
  }

  const posts = [...byContent.values()];
  const currentPosts = posts.filter((p) => p.publishedAt >= start && p.publishedAt <= end);
  const previousPosts = posts.filter((p) => p.publishedAt >= prevStart && p.publishedAt <= prevEnd);

  function groupByFormat(list: PostRow[]) {
    const map = new Map<ContentType, { total: number; count: number }>();
    for (const p of list) {
      const row = map.get(p.type) ?? { total: 0, count: 0 };
      row.total += p.interactions;
      row.count += 1;
      map.set(p.type, row);
    }
    return map;
  }

  function groupByHashtag(list: PostRow[]) {
    const map = new Map<string, { total: number; count: number }>();
    for (const p of list) {
      for (const tag of parseHashtags(p.body)) {
        const row = map.get(tag) ?? { total: 0, count: 0 };
        row.total += p.interactions;
        row.count += 1;
        map.set(tag, row);
      }
    }
    return map;
  }

  return {
    sampleSize: currentPosts.length,
    hasEnoughData: currentPosts.length >= 5,
    byFormat: buildTrendRows(groupByFormat(currentPosts), groupByFormat(previousPosts)),
    byHashtag: buildTrendRows(groupByHashtag(currentPosts), groupByHashtag(previousPosts)),
  };
}

import { prisma } from "@/lib/db";
import type { ContentType, SocialPlatform } from "@/lib/generated/prisma/enums";

function interactionsOf(m: { likes: number; comments: number; shares: number; saved: number; replies: number }) {
  return m.likes + m.comments + m.shares + m.saved + m.replies;
}

function rankByAvg<K>(map: Map<K, { total: number; count: number }>) {
  return [...map.entries()]
    .map(([key, { total, count }]) => ({ key, avg: total / count, count }))
    .sort((a, b) => b.avg - a.avg);
}

/**
 * Patterns pulled from the brand's own real historical posts - which day,
 * hour, and content type has actually gotten the most engagement, and
 * whether recent posts are trending up or down vs earlier ones. No
 * forecasting model, no external AI call - just averages over what already
 * happened, so it stays honest about small sample sizes (returns null under
 * 5 posts rather than a pattern that isn't really there yet).
 */
export async function getContentTrends(brandId: string, platform?: SocialPlatform) {
  const metrics = await prisma.metric.findMany({
    where: {
      content: { brandId, publishedAt: { not: null } },
      ...(platform ? { platform } : {}),
    },
    include: { content: { select: { id: true, type: true, publishedAt: true } } },
    orderBy: { capturedAt: "desc" },
  });

  // Latest snapshot per content+platform - Metric rows are one per sync, not
  // a running total, so summing every historical row would double count.
  const latestByContentPlatform = new Map<string, (typeof metrics)[number]>();
  for (const m of metrics) {
    const key = `${m.contentId}:${m.platform}`;
    if (!latestByContentPlatform.has(key)) latestByContentPlatform.set(key, m);
  }

  // Sum across platforms per content - a "best day to post" pattern is about
  // the post itself, not one connected account's share of it.
  const byContent = new Map<string, { publishedAt: Date; type: ContentType; interactions: number }>();
  for (const m of latestByContentPlatform.values()) {
    if (!m.content.publishedAt) continue;
    const existing = byContent.get(m.contentId) ?? {
      publishedAt: m.content.publishedAt,
      type: m.content.type,
      interactions: 0,
    };
    existing.interactions += interactionsOf(m);
    byContent.set(m.contentId, existing);
  }

  const posts = [...byContent.values()];
  if (posts.length < 5) return null;

  const byDay = new Map<number, { total: number; count: number }>();
  const byHour = new Map<number, { total: number; count: number }>();
  const byType = new Map<ContentType, { total: number; count: number }>();
  for (const p of posts) {
    const dayRow = byDay.get(p.publishedAt.getDay()) ?? { total: 0, count: 0 };
    dayRow.total += p.interactions;
    dayRow.count += 1;
    byDay.set(p.publishedAt.getDay(), dayRow);

    const hourRow = byHour.get(p.publishedAt.getHours()) ?? { total: 0, count: 0 };
    hourRow.total += p.interactions;
    hourRow.count += 1;
    byHour.set(p.publishedAt.getHours(), hourRow);

    const typeRow = byType.get(p.type) ?? { total: 0, count: 0 };
    typeRow.total += p.interactions;
    typeRow.count += 1;
    byType.set(p.type, typeRow);
  }

  // Chronological split down the middle - stays meaningful whether there
  // are 6 posts or 600, unlike a fixed "last 5 vs previous 5".
  const chronological = [...posts].sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
  const mid = Math.floor(chronological.length / 2);
  const earlier = chronological.slice(0, mid);
  const recent = chronological.slice(mid);
  const avg = (list: typeof posts) => list.reduce((sum, p) => sum + p.interactions, 0) / list.length;
  const earlierAvg = earlier.length > 0 ? avg(earlier) : null;
  const recentAvg = recent.length > 0 ? avg(recent) : null;
  const changePercent =
    earlierAvg !== null && recentAvg !== null && earlierAvg > 0
      ? ((recentAvg - earlierAvg) / earlierAvg) * 100
      : null;

  return {
    sampleSize: posts.length,
    byDay: rankByAvg(byDay).map((r) => ({ day: r.key, avg: r.avg, count: r.count })),
    byHour: rankByAvg(byHour).map((r) => ({ hour: r.key, avg: r.avg, count: r.count })),
    byType: rankByAvg(byType).map((r) => ({ type: r.key, avg: r.avg, count: r.count })),
    trend: { earlierAvg, recentAvg, changePercent },
  };
}

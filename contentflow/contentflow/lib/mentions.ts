import { prisma } from "@/lib/db";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

export type TopMention = {
  handle: string;
  mentionCount: number;
  likes: number;
  comments: number;
  reach: number;
  engagementRate: number | null;
  /** Platform the handle was most often mentioned on - used to build the right profile link (instagram.com vs tiktok.com). */
  platform: SocialPlatform | null;
};

/** Ranks accounts mentioned in captions by how often they're mentioned, with
 * the combined performance of the posts that mention them. */
export async function getTopMentions(brandId: string): Promise<TopMention[]> {
  const content = await prisma.content.findMany({
    where: { brandId, NOT: { mentions: { isEmpty: true } } },
    include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 } },
  });

  const byHandle = new Map<
    string,
    { mentionCount: number; likes: number; comments: number; reach: number; platformCounts: Map<SocialPlatform, number> }
  >();
  for (const item of content) {
    const m = item.metrics[0];
    // Synced content is created with a single originating platform - a
    // handful of platforms lets this stay correct even if that ever changes.
    const platform = item.platforms[0];
    for (const handle of item.mentions) {
      const row = byHandle.get(handle) ?? {
        mentionCount: 0,
        likes: 0,
        comments: 0,
        reach: 0,
        platformCounts: new Map<SocialPlatform, number>(),
      };
      row.mentionCount += 1;
      if (m) {
        row.likes += m.likes;
        row.comments += m.comments;
        row.reach += m.reach;
      }
      if (platform) row.platformCounts.set(platform, (row.platformCounts.get(platform) ?? 0) + 1);
      byHandle.set(handle, row);
    }
  }

  return [...byHandle.entries()]
    .map(([handle, row]) => {
      const topPlatform = [...row.platformCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return {
        handle,
        mentionCount: row.mentionCount,
        likes: row.likes,
        comments: row.comments,
        reach: row.reach,
        engagementRate: row.reach > 0 ? ((row.likes + row.comments) / row.reach) * 100 : null,
        platform: topPlatform,
      };
    })
    .sort((a, b) => b.mentionCount - a.mentionCount);
}

import { prisma } from "@/lib/db";

export type TopMention = {
  handle: string;
  mentionCount: number;
  likes: number;
  comments: number;
  reach: number;
  engagementRate: number | null;
};

/** Ranks accounts mentioned in captions by how often they're mentioned, with
 * the combined performance of the posts that mention them. */
export async function getTopMentions(brandId: string): Promise<TopMention[]> {
  const content = await prisma.content.findMany({
    where: { brandId, NOT: { mentions: { isEmpty: true } } },
    include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 } },
  });

  const byHandle = new Map<string, { mentionCount: number; likes: number; comments: number; reach: number }>();
  for (const item of content) {
    const m = item.metrics[0];
    for (const handle of item.mentions) {
      const row = byHandle.get(handle) ?? { mentionCount: 0, likes: 0, comments: 0, reach: 0 };
      row.mentionCount += 1;
      if (m) {
        row.likes += m.likes;
        row.comments += m.comments;
        row.reach += m.reach;
      }
      byHandle.set(handle, row);
    }
  }

  return [...byHandle.entries()]
    .map(([handle, row]) => ({
      handle,
      ...row,
      engagementRate: row.reach > 0 ? ((row.likes + row.comments) / row.reach) * 100 : null,
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount);
}

import { prisma } from "@/lib/db";
import { parseMentions } from "@/lib/text-parse";

/** Unread first, then newest - the inbox should surface what needs a reply. */
export function getCommentsForBrand(brandId: string) {
  return prisma.comment.findMany({
    where: { brandId },
    include: { content: { select: { id: true, title: true, thumbnailUrl: true } } },
    orderBy: [{ status: "asc" }, { publishedAt: "desc" }],
    take: 50,
  });
}

/** Instagram doesn't expose "who reposted/mentioned you" for this API - the
 * closest real signal is @handles other people use inside comments left on
 * your own posts, which is genuinely synced data (unlike a fabricated
 * "reposts" feature). */
export async function getMentionsFromComments(brandId: string) {
  const comments = await prisma.comment.findMany({ where: { brandId }, select: { authorUsername: true, body: true, publishedAt: true } });

  const byHandle = new Map<string, { handle: string; count: number; lastSeen: Date; lastBy: string }>();
  for (const comment of comments) {
    for (const handle of parseMentions(comment.body)) {
      const existing = byHandle.get(handle);
      if (!existing || comment.publishedAt > existing.lastSeen) {
        byHandle.set(handle, {
          handle,
          count: (existing?.count ?? 0) + 1,
          lastSeen: comment.publishedAt,
          lastBy: comment.authorUsername,
        });
      } else {
        existing.count += 1;
      }
    }
  }

  return [...byHandle.values()].sort((a, b) => b.count - a.count).slice(0, 10);
}

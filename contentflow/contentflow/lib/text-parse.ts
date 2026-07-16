/** Pure text parsing - no Prisma import, safe to use from client components
 * as well as the (server-only) sync pipeline, so mentions/hashtags stay
 * consistent whether they come from a synced caption or a manually edited one. */

export function parseMentions(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.matchAll(/@([a-zA-Z0-9._]+)/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

export function parseHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.matchAll(/#([a-zA-Z0-9_]+)/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

import { prisma } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;
const DIGEST_AVERAGE_WINDOW_DAYS = 30;

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function interactionsOf(m: { likes: number; comments: number; shares: number; saved: number; replies: number }) {
  return m.likes + m.comments + m.shares + m.saved + m.replies;
}

/** New comments + new DMs, newest first - the real, identity-attached
 * activity feed. Follower/like counts are aggregate-only on this platform
 * (Instagram doesn't say who liked or who followed), so those show up as
 * daily totals in the digest below instead of as individual notifications. */
export async function getNotificationFeed(brandId: string, workspaceId: string) {
  const [comments, messages] = await Promise.all([
    prisma.comment.findMany({
      where: { brandId },
      include: { content: { select: { id: true, title: true } } },
      orderBy: { publishedAt: "desc" },
      take: 20,
    }),
    prisma.message.findMany({
      where: { workspaceId },
      include: { content: { select: { id: true, title: true } } },
      orderBy: { receivedAt: "desc" },
      take: 20,
    }),
  ]);

  const feed = [
    ...comments.map((c) => ({
      id: `comment:${c.id}`,
      type: "comment" as const,
      actor: c.authorUsername,
      body: c.body,
      at: c.publishedAt,
      contentTitle: c.content.title,
      unread: c.status === "unread",
    })),
    ...messages.map((m) => ({
      id: `message:${m.id}`,
      type: "message" as const,
      actor: m.sender,
      body: m.body,
      at: m.receivedAt,
      contentTitle: m.content?.title ?? null,
      unread: m.status === "unread",
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return feed;
}

/** Per-day totals for a brand's content: posts touched, likes, comments,
 * reach - built the same way the Dashboard/Analytics charts already
 * aggregate metrics (latest snapshot per content per day), so the digest
 * stays consistent with what's shown elsewhere rather than introducing a
 * different counting rule. */
async function getDailyTotals(brandId: string, since: Date) {
  const metrics = await prisma.metric.findMany({
    where: { content: { brandId }, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
  });

  const latestPerContentDay = new Map<string, (typeof metrics)[number]>();
  for (const m of metrics) {
    const key = `${m.contentId}:${dayKey(m.capturedAt)}`;
    latestPerContentDay.set(key, m);
  }

  const byDay = new Map<
    string,
    { posts: Set<string>; likes: number; comments: number; reach: number; interactions: number }
  >();
  for (const [key, m] of latestPerContentDay) {
    const day = key.split(":")[1];
    const row = byDay.get(day) ?? { posts: new Set(), likes: 0, comments: 0, reach: 0, interactions: 0 };
    row.posts.add(m.contentId);
    row.likes += m.likes;
    row.comments += m.comments;
    row.reach += m.reach;
    row.interactions += interactionsOf(m);
    byDay.set(day, row);
  }

  return byDay;
}

async function getFollowerDeltasByDay(brandId: string, since: Date) {
  const snapshots = await prisma.accountSnapshot.findMany({
    where: { socialAccount: { brandId }, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
  });

  const latestPerAccountDay = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    latestPerAccountDay.set(`${s.socialAccountId}:${dayKey(s.capturedAt)}`, s);
  }
  const followersByDay = new Map<string, number>();
  for (const [key, s] of latestPerAccountDay) {
    const day = key.split(":")[1];
    followersByDay.set(day, (followersByDay.get(day) ?? 0) + s.followersCount);
  }

  const days = [...followersByDay.keys()].sort();
  const deltaByDay = new Map<string, number>();
  for (let i = 1; i < days.length; i++) {
    deltaByDay.set(days[i], followersByDay.get(days[i])! - followersByDay.get(days[i - 1])!);
  }
  return deltaByDay;
}

/**
 * "Yesterday" - the last fully-completed day - compared against this
 * brand's own trailing 30-day daily average for each metric. Real numbers
 * only: if there's no data for yesterday or no average to compare against,
 * that's shown plainly rather than papered over.
 */
export async function getDailyDigest(brandId: string) {
  const todayStart = startOfDay(new Date());
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  const windowStart = new Date(todayStart.getTime() - DIGEST_AVERAGE_WINDOW_DAYS * DAY_MS);

  const [dailyTotals, followerDeltas, commentsYesterday] = await Promise.all([
    getDailyTotals(brandId, windowStart),
    getFollowerDeltasByDay(brandId, windowStart),
    prisma.comment.count({
      where: { brandId, publishedAt: { gte: yesterdayStart, lt: todayStart } },
    }),
  ]);

  const yesterdayKey = dayKey(yesterdayStart);
  const yesterday = dailyTotals.get(yesterdayKey);

  const allDayTotals = [...dailyTotals.values()];
  const avg = (pick: (t: (typeof allDayTotals)[number]) => number) =>
    allDayTotals.length > 0 ? allDayTotals.reduce((s, t) => s + pick(t), 0) / allDayTotals.length : 0;

  const followerDeltaValues = [...followerDeltas.values()];
  const avgFollowerDelta =
    followerDeltaValues.length > 0
      ? followerDeltaValues.reduce((s, v) => s + v, 0) / followerDeltaValues.length
      : 0;

  return {
    date: yesterdayStart,
    hasData: Boolean(yesterday) || commentsYesterday > 0 || followerDeltas.has(yesterdayKey),
    posts: yesterday?.posts.size ?? 0,
    likes: yesterday?.likes ?? 0,
    comments: commentsYesterday,
    reach: yesterday?.reach ?? 0,
    followerDelta: followerDeltas.get(yesterdayKey) ?? 0,
    averages: {
      posts: avg((t) => t.posts.size),
      likes: avg((t) => t.likes),
      comments: avg((t) => t.comments),
      reach: avg((t) => t.reach),
      followerDelta: avgFollowerDelta,
    },
  };
}

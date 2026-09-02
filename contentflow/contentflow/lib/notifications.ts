import { prisma } from "@/lib/db";
import { interactionsOf } from "@/lib/metrics";

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

/**
 * What each day actually *gained*, not what the account is worth in total.
 *
 * Metric rows are cumulative: each sync stores a post's lifetime totals so
 * far. Reporting those directly meant the digest emailed the same "yesterday
 * you got 24,720 likes" every single day - the account's whole history, sent
 * out daily as if it had just happened. So each day's figure is the rise over
 * the previous known snapshot for that same post and platform.
 *
 * A post first seen on the day it was published counts in full (those
 * interactions really are new that day). A post that appears for the first
 * time but was published earlier contributes nothing: we genuinely don't know
 * which day those interactions came from, and guessing would be the same
 * mistake in a smaller disguise.
 */
async function getDailyGains(brandId: string, since: Date) {
  // Reaches one day further back than the window so the first reported day
  // still has a baseline to subtract from.
  const baselineStart = new Date(since.getTime() - DAY_MS);
  const metrics = await prisma.metric.findMany({
    where: { content: { brandId }, capturedAt: { gte: baselineStart } },
    include: { content: { select: { publishedAt: true } } },
    orderBy: { capturedAt: "asc" },
  });

  // Latest snapshot per post+platform per day, in chronological order.
  const seriesByPost = new Map<string, { day: string; metric: (typeof metrics)[number] }[]>();
  for (const m of metrics) {
    const postKey = `${m.contentId}:${m.platform}`;
    const day = dayKey(m.capturedAt);
    const series = seriesByPost.get(postKey) ?? [];
    const last = series[series.length - 1];
    if (last && last.day === day) last.metric = m;
    else series.push({ day, metric: m });
    seriesByPost.set(postKey, series);
  }

  const byDay = new Map<
    string,
    { posts: Set<string>; likes: number; comments: number; reach: number; interactions: number }
  >();

  for (const series of seriesByPost.values()) {
    series.forEach((point, i) => {
      const previous = i > 0 ? series[i - 1].metric : null;
      const publishedAt = point.metric.content.publishedAt;

      let likes: number;
      let comments: number;
      let reach: number;
      let interactions: number;

      if (previous) {
        // Cumulative counts can dip (a deleted comment, a corrected figure) -
        // clamp at zero rather than letting a negative day drag the average.
        likes = Math.max(0, point.metric.likes - previous.likes);
        comments = Math.max(0, point.metric.comments - previous.comments);
        reach = Math.max(0, point.metric.reach - previous.reach);
        interactions = Math.max(0, interactionsOf(point.metric) - interactionsOf(previous));
      } else if (publishedAt && dayKey(publishedAt) === point.day) {
        likes = point.metric.likes;
        comments = point.metric.comments;
        reach = point.metric.reach;
        interactions = interactionsOf(point.metric);
      } else {
        return;
      }

      const row = byDay.get(point.day) ?? {
        posts: new Set<string>(),
        likes: 0,
        comments: 0,
        reach: 0,
        interactions: 0,
      };
      if (publishedAt && dayKey(publishedAt) === point.day) row.posts.add(point.metric.contentId);
      row.likes += likes;
      row.comments += comments;
      row.reach += reach;
      row.interactions += interactions;
      byDay.set(point.day, row);
    });
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
 * brand's own trailing 30-day daily average for each metric. Every figure is
 * what that day *gained*, never a running lifetime total. Real numbers only:
 * if there's no data for yesterday or no average to compare against, that's
 * shown plainly rather than papered over.
 */
export async function getDailyDigest(brandId: string) {
  const todayStart = startOfDay(new Date());
  const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
  const windowStart = new Date(todayStart.getTime() - DIGEST_AVERAGE_WINDOW_DAYS * DAY_MS);

  const [dailyTotals, followerDeltas, commentsYesterday] = await Promise.all([
    getDailyGains(brandId, windowStart),
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

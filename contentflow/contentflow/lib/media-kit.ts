import type { ContentType } from "@/lib/generated/prisma/enums";
import type { getAnalyticsData } from "@/lib/analytics";

type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>;

/** Instagram's "feed post" is any in-grid format - our post/carousel/video -
 * as opposed to stories and reels, which the media kit analyses separately
 * because their metrics aren't comparable (a story has exits, a reel has plays). */
const FEED_TYPES: ContentType[] = ["post", "carousel", "video"];

export type KitMetricKind = "count" | "percent" | "decimal";

export type KitMetric = {
  label: string;
  value: number | null;
  kind: KitMetricKind;
};

export type FormatAnalysis = {
  key: "feed" | "stories" | "reels";
  title: string;
  subtitle: string;
  posts: number;
  metrics: KitMetric[];
};

/** Targets a profile has to hit for a score component to reach 100. They're
 * deliberately stated here rather than buried in the maths so the media kit's
 * glossary can explain exactly what the score means - an unexplained score
 * is worth nothing to the brand reading it. */
const SCORE_TARGETS = {
  /** Avg interactions per post, as a share of followers. */
  engagementRate: 6,
  /** Share of interactions that are comments/saves/shares rather than likes -
   * cheap to like, expensive to comment, so this reads as audience quality. */
  engagementQuality: 15,
  /** Avg likes per post per 1 000 followers. */
  likesPer1k: 60,
  /** Avg reach per post, as a share of followers. */
  reachPerFollower: 100,
  /** Posts published per day across the window. */
  postFrequency: 0.5,
};

export type ScoreComponent = { label: string; percent: number };

export type MediaKitOverview = {
  followers: number;
  followerGrowthPercent: number | null;
  followerGrowthPerDay: number | null;
  feedPosts: number;
  stories: number;
  reels: number;
  totalPosts: number;
  impressions: number;
  reach: number;
  interactions: number;
  viralityRate: number | null;
};

export type MediaKitEngagement = {
  engagementRate: number | null;
  engagementPer1kFollowers: number | null;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  avgLikes: number | null;
  avgComments: number | null;
  avgSaves: number | null;
  avgShares: number | null;
};

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

function scoreOf(value: number | null, target: number) {
  if (value === null || value <= 0) return 0;
  return Math.min(100, (value / target) * 100);
}

function avg(total: number, posts: number) {
  return posts > 0 ? total / posts : null;
}

/**
 * Turns the raw analytics window into everything the media kit prints:
 * headline overview, engagement block, per-format analysis and the
 * influencer score. Every value here is derived from synced metrics - nothing
 * is estimated or filled in when a platform doesn't report it (stories and
 * reels simply don't show up when there's no such content in the window).
 */
export function buildMediaKit({
  analytics,
  followers,
  days,
}: {
  analytics: AnalyticsData;
  followers: number;
  days: number;
}) {
  const byType = new Map(analytics.byType.map((row) => [row.type, row]));

  function sumTypes(types: ContentType[]) {
    const rows = types.map((t) => byType.get(t)).filter((r) => r !== undefined);
    return rows.reduce(
      (acc, row) => ({
        posts: acc.posts + row.posts,
        likes: acc.likes + row.likes,
        comments: acc.comments + row.comments,
        shares: acc.shares + row.shares,
        saved: acc.saved + row.saved,
        reach: acc.reach + row.reach,
        impressions: acc.impressions + row.impressions,
        videoViews: acc.videoViews + row.videoViews,
        replies: acc.replies + row.replies,
        exits: acc.exits + row.exits,
      }),
      {
        posts: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saved: 0,
        reach: 0,
        impressions: 0,
        videoViews: 0,
        replies: 0,
        exits: 0,
      }
    );
  }

  const feed = sumTypes(FEED_TYPES);
  const stories = sumTypes(["story"]);
  const reels = sumTypes(["reel"]);

  const totals = analytics.totals;
  const interactions =
    totals.likes + totals.comments + totals.shares + totals.saved + totals.replies;
  const totalPosts = analytics.perPost.length;

  const feedInteractions = feed.likes + feed.comments + feed.saved;
  const reelInteractions = reels.likes + reels.comments + reels.saved + reels.shares;

  const overview: MediaKitOverview = {
    followers,
    followerGrowthPercent: analytics.followerGrowth.followers,
    followerGrowthPerDay:
      analytics.followerSeries.length > 1
        ? (analytics.followerSeries[analytics.followerSeries.length - 1].value -
            analytics.followerSeries[0].value) /
          days
        : null,
    feedPosts: feed.posts,
    stories: stories.posts,
    reels: reels.posts,
    totalPosts,
    impressions: totals.impressions,
    reach: totals.reach,
    interactions,
    // How far each interaction travels beyond the feed - the closest honest
    // stand-in for "virality" the platform APIs actually give us.
    viralityRate: ratio(interactions, totals.impressions) !== null
      ? (interactions / totals.impressions) * 100
      : null,
  };

  const engagement: MediaKitEngagement = {
    engagementRate: analytics.engagementRates.byFollowers,
    engagementPer1kFollowers:
      followers > 0 && totalPosts > 0 ? (interactions / totalPosts / followers) * 1000 : null,
    likes: totals.likes,
    comments: totals.comments,
    saves: totals.saved,
    shares: totals.shares,
    avgLikes: avg(totals.likes, totalPosts),
    avgComments: avg(totals.comments, totalPosts),
    avgSaves: avg(totals.saved, totalPosts),
    avgShares: avg(totals.shares, totalPosts),
  };

  const formats: FormatAnalysis[] = [];

  if (feed.posts > 0) {
    formats.push({
      key: "feed",
      title: "Analysis of feed posts",
      subtitle: "Data generated in posts divided by the number of posts made.",
      posts: feed.posts,
      metrics: [
        { label: "Avg. reach", value: avg(feed.reach, feed.posts), kind: "count" },
        { label: "Avg. impressions", value: avg(feed.impressions, feed.posts), kind: "count" },
        { label: "Avg. likes", value: avg(feed.likes, feed.posts), kind: "count" },
        { label: "Avg. comments", value: avg(feed.comments, feed.posts), kind: "count" },
        { label: "Avg. saves", value: avg(feed.saved, feed.posts), kind: "count" },
        {
          label: "Engagement rate",
          value:
            followers > 0 && feed.posts > 0
              ? (feedInteractions / feed.posts / followers) * 100
              : null,
          kind: "percent",
        },
      ],
    });
  }

  if (stories.posts > 0) {
    formats.push({
      key: "stories",
      title: "Analysis of stories",
      subtitle: "Data generated in stories divided by the number of stories made.",
      posts: stories.posts,
      metrics: [
        { label: "Avg. reach", value: avg(stories.reach, stories.posts), kind: "count" },
        { label: "Avg. impressions", value: avg(stories.impressions, stories.posts), kind: "count" },
        { label: "Avg. exits", value: avg(stories.exits, stories.posts), kind: "count" },
        { label: "Avg. replies", value: avg(stories.replies, stories.posts), kind: "count" },
      ],
    });
  }

  if (reels.posts > 0) {
    formats.push({
      key: "reels",
      title: "Analysis of reels",
      subtitle: "Data generated in reels divided by the number of reels made.",
      posts: reels.posts,
      metrics: [
        { label: "Avg. reach", value: avg(reels.reach, reels.posts), kind: "count" },
        { label: "Avg. plays", value: avg(reels.videoViews, reels.posts), kind: "count" },
        { label: "Avg. likes", value: avg(reels.likes, reels.posts), kind: "count" },
        { label: "Avg. comments", value: avg(reels.comments, reels.posts), kind: "count" },
        { label: "Avg. saves", value: avg(reels.saved, reels.posts), kind: "count" },
        { label: "Avg. shares", value: avg(reels.shares, reels.posts), kind: "count" },
        {
          label: "Engagement rate",
          value:
            followers > 0 && reels.posts > 0
              ? (reelInteractions / reels.posts / followers) * 100
              : null,
          kind: "percent",
        },
      ],
    });
  }

  const qualityInteractions = totals.comments + totals.saved + totals.shares;
  const components: ScoreComponent[] = [
    {
      label: "Avg. engagement rate",
      percent: scoreOf(engagement.engagementRate, SCORE_TARGETS.engagementRate),
    },
    {
      label: "Engagement quality",
      percent: scoreOf(
        interactions > 0 ? (qualityInteractions / interactions) * 100 : null,
        SCORE_TARGETS.engagementQuality
      ),
    },
    {
      label: "Likes per 1k followers",
      percent: scoreOf(
        followers > 0 && totalPosts > 0 ? (totals.likes / totalPosts / followers) * 1000 : null,
        SCORE_TARGETS.likesPer1k
      ),
    },
    {
      label: "Reach per follower",
      percent: scoreOf(
        followers > 0 && totalPosts > 0 ? (totals.reach / totalPosts / followers) * 100 : null,
        SCORE_TARGETS.reachPerFollower
      ),
    },
    {
      label: "Post frequency",
      percent: scoreOf(days > 0 ? totalPosts / days : null, SCORE_TARGETS.postFrequency),
    },
  ];

  const score = Math.round(
    components.reduce((sum, c) => sum + c.percent, 0) / components.length
  );

  return { overview, engagement, formats, score, scoreComponents: components, days };
}

export const SCORE_GLOSSARY: { term: string; definition: string }[] = [
  {
    term: "Engagement",
    definition: "The sum of interactions on a post: likes, comments, saves, shares and replies.",
  },
  {
    term: "Engagement rate",
    definition:
      "Average interactions per post divided by total followers, as a percentage. Averaged per post, so it doesn't inflate as more posts get synced.",
  },
  {
    term: "Engagement per 1k followers",
    definition: "Average interactions per post per 1 000 followers.",
  },
  {
    term: "Virality rate",
    definition: "Total interactions divided by total impressions, as a percentage.",
  },
  {
    term: "Influencer score",
    definition:
      `The average of five components, each capped at 100: engagement rate (target ${SCORE_TARGETS.engagementRate}%), engagement quality (target ${SCORE_TARGETS.engagementQuality}% of interactions being comments, saves or shares), likes per 1 000 followers (target ${SCORE_TARGETS.likesPer1k}), reach per follower (target ${SCORE_TARGETS.reachPerFollower}%) and post frequency (target ${SCORE_TARGETS.postFrequency} posts per day).`,
  },
  {
    term: "Reach vs impressions",
    definition:
      "Reach counts unique accounts that saw the content; impressions count every view, including repeat views by the same account.",
  },
];

/**
 * The single definition of how metric rows turn into numbers, shared by the
 * Dashboard, Analytics, Social Hub and the media kit.
 *
 * It lives on its own because getting this wrong is invisible: every screen
 * still renders, the totals are just silently inflated. Dashboard and
 * Analytics each had their own copy of these rules and drifted apart, which
 * is what made the same brand show two different "interactions" numbers.
 */

export type MetricLike = {
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  replies: number;
};

/** Interactions = every deliberate action a person takes on a post. */
export function interactionsOf(m: MetricLike) {
  return m.likes + m.comments + m.shares + m.saved + m.replies;
}

type SnapshotLike = { platform: string; capturedAt: Date };

/**
 * Metric rows are *cumulative snapshots*: every sync writes a new row holding
 * the post's lifetime totals so far. Only the most recent row per platform
 * reflects reality - summing the history multiplies every total by however
 * many times that post has been synced.
 */
export function latestSnapshotPerPlatform<T extends SnapshotLike>(metrics: T[]): T[] {
  const latest = new Map<string, T>();
  for (const m of metrics) {
    const current = latest.get(m.platform);
    if (!current || m.capturedAt > current.capturedAt) latest.set(m.platform, m);
  }
  return [...latest.values()];
}

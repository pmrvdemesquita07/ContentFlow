import { test } from "node:test";
import assert from "node:assert/strict";
import { interactionsOf, latestSnapshotPerPlatform } from "../lib/metrics.ts";

/**
 * Metric rows are cumulative snapshots: each sync stores a post's lifetime
 * totals so far. Summing the history instead of taking the latest row is what
 * made the Dashboard report 166,720 interactions where the truth was 41,680 -
 * a number that grew every time anyone pressed "Sync now".
 *
 * These are the two functions that rule now lives in.
 */

const snapshot = (
  platform: string,
  capturedAt: string,
  values: Partial<Record<"likes" | "comments" | "shares" | "saved" | "replies", number>> = {}
) => ({
  platform,
  capturedAt: new Date(capturedAt),
  likes: 0,
  comments: 0,
  shares: 0,
  saved: 0,
  replies: 0,
  ...values,
});

test("interactions count every deliberate action, once each", () => {
  assert.equal(
    interactionsOf({ likes: 10, comments: 4, shares: 3, saved: 2, replies: 1 }),
    20
  );
  assert.equal(interactionsOf({ likes: 0, comments: 0, shares: 0, saved: 0, replies: 0 }), 0);
});

test("repeated syncs of the same post do not inflate the total", () => {
  // Three syncs of one post: 100 likes, then 130, then 145.
  const history = [
    snapshot("instagram", "2026-08-01T10:00:00Z", { likes: 100 }),
    snapshot("instagram", "2026-08-02T10:00:00Z", { likes: 130 }),
    snapshot("instagram", "2026-08-03T10:00:00Z", { likes: 145 }),
  ];

  const latest = latestSnapshotPerPlatform(history);
  const total = latest.reduce((sum, m) => sum + interactionsOf(m), 0);

  assert.equal(latest.length, 1, "one platform should collapse to one row");
  assert.equal(total, 145, "the total is the newest snapshot, not 100 + 130 + 145");
});

test("a post on two platforms keeps one row per platform", () => {
  const history = [
    snapshot("instagram", "2026-08-01T10:00:00Z", { likes: 100 }),
    snapshot("instagram", "2026-08-03T10:00:00Z", { likes: 145 }),
    snapshot("tiktok", "2026-08-01T10:00:00Z", { likes: 40 }),
    snapshot("tiktok", "2026-08-03T10:00:00Z", { likes: 60 }),
  ];

  const latest = latestSnapshotPerPlatform(history);
  const total = latest.reduce((sum, m) => sum + interactionsOf(m), 0);

  assert.equal(latest.length, 2);
  assert.equal(total, 205, "145 on Instagram plus 60 on TikTok");
});

test("snapshot order in the input doesn't change the answer", () => {
  // The sync pipeline makes no promise about ordering, so neither can this.
  const oldest = snapshot("instagram", "2026-08-01T10:00:00Z", { likes: 100 });
  const newest = snapshot("instagram", "2026-08-03T10:00:00Z", { likes: 145 });

  assert.equal(interactionsOf(latestSnapshotPerPlatform([oldest, newest])[0]), 145);
  assert.equal(interactionsOf(latestSnapshotPerPlatform([newest, oldest])[0]), 145);
});

test("an empty history yields nothing rather than throwing", () => {
  assert.deepEqual(latestSnapshotPerPlatform([]), []);
});

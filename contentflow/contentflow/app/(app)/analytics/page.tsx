import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getAnalyticsData } from "@/lib/analytics";
import { DASHBOARD_RANGES, type DashboardRange } from "@/lib/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart } from "@/components/charts/bar-chart";
import { GrowthBadge } from "@/components/analytics/growth-badge";
import { cn } from "@/lib/utils";

const STAT_LABELS = [
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "saved", label: "Saved" },
  { key: "shares", label: "Shares" },
  { key: "reach", label: "Reach" },
  { key: "videoViews", label: "Video views" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  post: "Post",
  reel: "Reel",
  carousel: "Carousel",
  video: "Video",
  story: "Story",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const activeRange: DashboardRange =
    range && range in DASHBOARD_RANGES ? (range as DashboardRange) : "30d";

  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const {
    totals,
    growth,
    byCampaign,
    byType,
    perPost,
    hasAnyMetrics,
    followerTotals,
    followerGrowth,
    hasAnyAccounts,
  } = await getAnalyticsData(ctx.brand.id, activeRange);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Real performance only - nothing here is estimated. Growth compares now vs the start
            of the selected period.
          </p>
        </div>
        <div className="flex gap-1">
          {(Object.entries(DASHBOARD_RANGES) as [DashboardRange, { label: string }][]).map(
            ([key, { label }]) => (
              <Link
                key={key}
                href={`/analytics?range=${key}`}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm font-medium",
                  activeRange === key
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </Link>
            )
          )}
        </div>
      </div>

      {!hasAnyMetrics ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">
              No metrics yet. Connect an account in Social Hub and metrics will start showing up
              here as your posts collect real likes, comments, shares, and reach.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {hasAnyAccounts && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Followers</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-semibold">
                      {followerTotals.followers.toLocaleString()}
                    </p>
                    <GrowthBadge value={followerGrowth.followers} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">Following</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-semibold">
                      {followerTotals.following.toLocaleString()}
                    </p>
                    <GrowthBadge value={followerGrowth.following} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {STAT_LABELS.map(({ key, label }) => (
              <Card key={key}>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-semibold">{totals[key].toLocaleString()}</p>
                  <GrowthBadge value={growth[key]} />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="pt-5">
                <h2 className="mb-4 text-sm font-semibold">Top posts by engagement</h2>
                <BarChart
                  items={perPost.slice(0, 8).map((p) => ({ label: p.title, value: p.interactions }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <h2 className="mb-4 text-sm font-semibold">Interactions by content type</h2>
                <BarChart
                  items={byType
                    .map((row) => ({
                      label: TYPE_LABELS[row.type] ?? row.type,
                      value: row.likes + row.comments + row.shares + row.saved,
                    }))
                    .sort((a, b) => b.value - a.value)}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-5">
              <h2 className="mb-3 text-sm font-semibold">By campaign</h2>
              <div className="flex flex-col divide-y">
                {byCampaign.map((row) => (
                  <div
                    key={row.campaignId}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span>{row.campaignId === "uncategorized" ? "No campaign" : row.campaignId}</span>
                    <span className="text-muted-foreground">
                      {row.likes + row.comments + row.shares} interactions - {row.reach} reach
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h2 className="mb-3 text-sm font-semibold">All posts</h2>
              <div className="flex flex-col divide-y">
                {perPost.map((post) => (
                  <a
                    key={post.contentId}
                    href={post.externalUrl ?? undefined}
                    target={post.externalUrl ? "_blank" : undefined}
                    rel={post.externalUrl ? "noreferrer" : undefined}
                    className="flex items-center gap-3 py-3 hover:bg-accent/50"
                  >
                    {post.thumbnailUrl ? (
                      // Instagram's CDN links expire, so this is refreshed on every sync
                      // rather than pointed at next/image (which would need the dynamic
                      // CDN hostnames allow-listed).
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.thumbnailUrl}
                        alt=""
                        className="size-12 shrink-0 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-12 shrink-0 rounded bg-muted" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="truncate text-sm font-medium">{post.title}</p>
                      <Badge variant="outline" className="w-fit capitalize">
                        {TYPE_LABELS[post.type] ?? post.type}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-5 gap-4 text-right text-xs text-muted-foreground">
                      <span>{post.likes.toLocaleString()} likes</span>
                      <span>{post.comments.toLocaleString()} comments</span>
                      <span>{post.saved.toLocaleString()} saved</span>
                      <span>{post.reach.toLocaleString()} reach</span>
                      <span>
                        {post.videoViews > 0 ? `${post.videoViews.toLocaleString()} views` : "-"}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

import { MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getAnalyticsData } from "@/lib/analytics";
import { getBrandAudienceDemographics } from "@/lib/demographics";
import { getTopMentions } from "@/lib/mentions";
import { getSocialAccountsForBrand } from "@/lib/social";
import { resolveDateRange } from "@/lib/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { GrowthBadge } from "@/components/analytics/growth-badge";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import { AccountSwitcher } from "@/components/analytics/account-switcher";
import { ExportCsvButton } from "@/components/analytics/export-csv-button";
import { toCsv } from "@/lib/csv";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

const STAT_LABELS = [
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "saved", label: "Saved" },
  { key: "shares", label: "Shares" },
  { key: "reach", label: "Reach" },
  { key: "videoViews", label: "Video views" },
] as const;

const STORY_STAT_LABELS = [
  { key: "replies", label: "Replies" },
  { key: "exits", label: "Exits" },
  { key: "tapsForward", label: "Taps forward" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  post: "Post",
  reel: "Reel",
  carousel: "Carousel",
  video: "Video",
  story: "Story",
};

function formatRate(value: number | null) {
  return value !== null ? `${value.toFixed(1)}%` : "-";
}

function mentionProfileUrl(handle: string, platform: SocialPlatform | null) {
  if (platform === "tiktok") return `https://www.tiktok.com/@${handle}`;
  return `https://instagram.com/${handle}`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; account?: string }>;
}) {
  const params = await searchParams;
  const resolvedRange = resolveDateRange(params);

  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const connectedAccounts = await getSocialAccountsForBrand(ctx.brand.id);
  const selectedPlatform = connectedAccounts.some((a) => a.platform === params.account)
    ? (params.account as SocialPlatform)
    : undefined;

  const {
    totals,
    growth,
    byCampaign,
    byType,
    byPlatform,
    perPost,
    hasAnyMetrics,
    followerTotals,
    followerGrowth,
    hasAnyAccounts,
    engagementRates,
    followerSeries,
    engagementSeries,
  } = await getAnalyticsData(ctx.brand.id, resolvedRange, selectedPlatform);

  const demographics = await getBrandAudienceDemographics(ctx.brand.id, selectedPlatform);
  const topMentions = await getTopMentions(ctx.brand.id);

  const hasStoryMetrics = totals.replies + totals.exits + totals.tapsForward > 0;
  const percentFormatter = (v: number) => `${v.toFixed(0)}%`;

  const csv = toCsv(
    [
      "Title",
      "Type",
      "Likes",
      "Comments",
      "Shares",
      "Saved",
      "Reach",
      "Video views",
      "Replies",
      "Exits",
      "Taps forward",
      "Interactions",
      "Engagement rate (followers) %",
      "Engagement rate (views) %",
      "Location",
      "Mentions",
    ],
    perPost.map((p) => [
      p.title,
      TYPE_LABELS[p.type] ?? p.type,
      p.likes,
      p.comments,
      p.shares,
      p.saved,
      p.reach,
      p.videoViews,
      p.replies,
      p.exits,
      p.tapsForward,
      p.interactions,
      p.engagementRateByFollowers?.toFixed(1) ?? "",
      p.engagementRateByViews?.toFixed(1) ?? "",
      p.locationName ?? "",
      p.mentions.map((m) => `@${m}`).join(" "),
    ])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Real performance only - nothing here is estimated. Showing posts published in{" "}
            {resolvedRange.label}; growth compares against the equivalent previous period.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {connectedAccounts.length > 1 ? (
            <AccountSwitcher
              accounts={connectedAccounts.map((a) => ({
                platform: a.platform,
                label: PLATFORM_LABELS[a.platform],
                username: a.externalUsername,
              }))}
              current={selectedPlatform}
              basePath="/analytics"
              range={resolvedRange}
            />
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            <DateRangePicker
              basePath="/analytics"
              current={resolvedRange}
              extraParams={selectedPlatform ? { account: selectedPlatform } : undefined}
            />
            <ExportCsvButton filename={`analytics-${resolvedRange.key}.csv`} csv={csv} />
          </div>
        </div>
      </div>

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

      {byPlatform.length > 1 && (
        <Card>
          <CardContent className="pt-5">
            <h2 className="mb-4 text-sm font-semibold">Instagram vs TikTok</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-medium text-muted-foreground">Followers</p>
                <BarChart
                  items={byPlatform.map((p) => ({
                    label: PLATFORM_LABELS[p.platform],
                    value: p.followers,
                  }))}
                />
              </div>
              <div>
                <p className="mb-3 text-xs font-medium text-muted-foreground">
                  Interactions ({resolvedRange.label})
                </p>
                <BarChart
                  items={byPlatform.map((p) => ({
                    label: PLATFORM_LABELS[p.platform],
                    value: p.interactions,
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasAnyAccounts && (followerSeries.length > 1 || engagementSeries.length > 1) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-5">
              <h2 className="mb-4 text-sm font-semibold">
                Followers over time{selectedPlatform ? ` - ${PLATFORM_LABELS[selectedPlatform]}` : ""}
              </h2>
              <LineChart points={followerSeries} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <h2 className="mb-4 text-sm font-semibold">
                Interactions over time{selectedPlatform ? ` - ${PLATFORM_LABELS[selectedPlatform]}` : ""}
              </h2>
              <LineChart points={engagementSeries} />
            </CardContent>
          </Card>
        </div>
      )}

      {hasAnyAccounts && (
        <Card>
          <CardContent className="pt-5">
            <h2 className="text-sm font-semibold">Audience</h2>
            {!demographics.hasData ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedPlatform === "tiktok"
                  ? "TikTok's public API doesn't expose audience demographics for third-party apps."
                  : "No audience breakdown yet. Instagram only exposes gender, age, and location data for accounts with 100+ followers."}
              </p>
            ) : (
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                {demographics.gender.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-medium text-muted-foreground">Gender</p>
                    <BarChart
                      items={demographics.gender.map((d) => ({ label: d.label, value: d.percent }))}
                      valueFormatter={percentFormatter}
                    />
                  </div>
                )}
                {demographics.age.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-medium text-muted-foreground">Age</p>
                    <BarChart
                      items={demographics.age.map((d) => ({ label: d.label, value: d.percent }))}
                      valueFormatter={percentFormatter}
                    />
                  </div>
                )}
                {demographics.topCountries.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-medium text-muted-foreground">Top countries</p>
                    <BarChart
                      items={demographics.topCountries.map((d) => ({
                        label: d.label,
                        value: d.percent,
                      }))}
                      valueFormatter={percentFormatter}
                    />
                  </div>
                )}
                {demographics.topCities.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-medium text-muted-foreground">Top cities</p>
                    <BarChart
                      items={demographics.topCities.map((d) => ({
                        label: d.label,
                        value: d.percent,
                      }))}
                      valueFormatter={percentFormatter}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
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

          {hasStoryMetrics && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Story metrics (only apply to Stories)
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {STORY_STAT_LABELS.map(({ key, label }) => (
                  <Card key={key}>
                    <CardContent className="pt-5">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-2xl font-semibold">{totals[key].toLocaleString()}</p>
                      <GrowthBadge value={growth[key]} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground">Engagement rate (by followers)</p>
                <p className="text-2xl font-semibold">
                  {formatRate(engagementRates.byFollowers)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground">Engagement rate (by views)</p>
                <p className="text-2xl font-semibold">{formatRate(engagementRates.byViews)}</p>
              </CardContent>
            </Card>
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
                      value: row.likes + row.comments + row.shares + row.saved + row.replies,
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
                    {row.campaignId === "uncategorized" ? (
                      <span>No campaign</span>
                    ) : (
                      <a href={`/campaigns/${row.campaignId}`} className="hover:underline">
                        {row.campaignName ?? row.campaignId}
                      </a>
                    )}
                    <span className="text-muted-foreground">
                      {row.likes + row.comments + row.shares + row.saved + row.replies}{" "}
                      interactions -{" "}
                      {row.reach} reach
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {topMentions.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <h2 className="mb-3 text-sm font-semibold">Top mentions</h2>
                <p className="mb-3 text-xs text-muted-foreground">
                  Accounts mentioned in your captions - pages or other creators - ranked by how
                  often they&apos;re tagged.
                </p>
                <div className="flex flex-col divide-y">
                  {topMentions.slice(0, 10).map((row) => (
                    <div
                      key={row.handle}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 text-sm"
                    >
                      <a
                        href={mentionProfileUrl(row.handle, row.platform)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium hover:underline"
                      >
                        @{row.handle}
                      </a>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{row.mentionCount} mentions</span>
                        <span>{row.likes.toLocaleString()} likes</span>
                        <span>{row.comments.toLocaleString()} comments</span>
                        <span>{formatRate(row.engagementRate)} eng. rate</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="w-fit capitalize">
                          {TYPE_LABELS[post.type] ?? post.type}
                        </Badge>
                        {post.locationName && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" />
                            {post.locationName}
                          </span>
                        )}
                        {post.mentions.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {post.mentions.map((m) => `@${m}`).join(" ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex max-w-md flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{post.likes.toLocaleString()} likes</span>
                      <span>{post.comments.toLocaleString()} comments</span>
                      <span>{post.saved.toLocaleString()} saved</span>
                      <span>{post.reach.toLocaleString()} reach</span>
                      {post.videoViews > 0 && (
                        <span>{post.videoViews.toLocaleString()} views</span>
                      )}
                      {post.type === "story" && (
                        <>
                          <span>{post.replies.toLocaleString()} replies</span>
                          <span>{post.exits.toLocaleString()} exits</span>
                          <span>{post.tapsForward.toLocaleString()} taps forward</span>
                        </>
                      )}
                      <span>{formatRate(post.engagementRateByFollowers)} eng/followers</span>
                      <span>{formatRate(post.engagementRateByViews)} eng/views</span>
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

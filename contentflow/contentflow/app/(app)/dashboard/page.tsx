import Link from "next/link";
import { TrendingUp, Megaphone, SquareCheck, CalendarDays, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getDashboardData, getDashboardOverview, resolveDateRange } from "@/lib/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart } from "@/components/charts/line-chart";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import { ExportCsvButton } from "@/components/analytics/export-csv-button";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { toCsv } from "@/lib/csv";
import { ExportPdfButton } from "./export-button";
import { cn } from "@/lib/utils";
import type { ContentStatus } from "@/lib/generated/prisma/enums";

const STATUS_LABELS: Record<ContentStatus, string> = {
  idea: "Ideas",
  draft: "Drafts",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

function GrowthTag({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">new</span>;
  const positive = value >= 0;
  return (
    <span className={cn("text-xs font-medium", positive ? "text-success" : "text-destructive")}>
      {positive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const resolvedRange = resolveDateRange(await searchParams);

  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const [
    {
      counts,
      highEngagement,
      hasAnyMetrics,
      followerTotals,
      hasAnyAccounts,
      followerSeries,
      engagementSeries,
    },
    overview,
  ] = await Promise.all([
    getDashboardData(ctx.brand.id, resolvedRange),
    getDashboardOverview(ctx.brand.id),
  ]);

  // Merge the two day-bucketed series into one row per day for the CSV export.
  const byDay = new Map<string, { followers?: number; engagement?: number }>();
  for (const p of followerSeries) byDay.set(p.label, { ...byDay.get(p.label), followers: p.value });
  for (const p of engagementSeries) byDay.set(p.label, { ...byDay.get(p.label), engagement: p.value });
  const csv = toCsv(
    ["Date", "Followers", "Engagement"],
    [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, row]) => [day, row.followers ?? "", row.engagement ?? ""])
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {ctx.workspace.name} - {ctx.brand.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="print-hide">
            <DateRangePicker basePath="/dashboard" current={resolvedRange} />
          </div>
          <ExportCsvButton filename={`dashboard-${resolvedRange.key}.csv`} csv={csv} />
          <ExportPdfButton />
        </div>
      </div>

      {/* Last 7 days at a glance - fixed window, independent of the range picker above. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Posts published (7d)</p>
            <p className="text-2xl font-semibold">{overview.last7Days.posts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Interactions (7d)</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold">
                {overview.last7Days.interactions.toLocaleString()}
              </p>
              <GrowthTag value={overview.last7Days.interactionsGrowth} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Reach (7d)</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold">{overview.last7Days.reach.toLocaleString()}</p>
              <GrowthTag value={overview.last7Days.reachGrowth} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4 text-primary" />
              Top performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.topPerformers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No published posts with metrics in the last 30 days yet.
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {overview.topPerformers.map((post) => (
                  <li key={post.id} className="flex items-center gap-3 py-2.5">
                    {post.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.thumbnailUrl}
                        alt=""
                        className="size-10 shrink-0 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-10 shrink-0 rounded bg-muted" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {post.title}
                    </span>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {post.type}
                    </Badge>
                    <Badge variant="success" className="shrink-0">
                      {post.interactions.toLocaleString()}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="size-4 text-primary" />
              Active campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.activeCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No campaigns running right now.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {overview.activeCampaigns.map((campaign) => (
                  <li key={campaign.id} className="py-2.5">
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {campaign.name}
                    </Link>
                    {campaign.endDate && (
                      <p className="text-xs text-muted-foreground">
                        Ends {new Date(campaign.endDate).toLocaleDateString()}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SquareCheck className="size-4 text-primary" />
              To-dos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing outstanding - nice.</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {overview.upcomingTasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2.5 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                    {task.dueDate && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    <PriorityBadge priority={task.priority} />
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/tasks"
              className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              View all tasks →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-primary" />
              Today &amp; tomorrow
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.todayItems.length === 0 && overview.tomorrowItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled for today or tomorrow.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    Today
                  </p>
                  {overview.todayItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing today.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {overview.todayItems.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="shrink-0 capitalize">
                            {item.type}
                          </Badge>
                          <span className="min-w-0 flex-1 truncate">{item.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    Tomorrow
                  </p>
                  {overview.tomorrowItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing tomorrow.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {overview.tomorrowItems.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="shrink-0 capitalize">
                            {item.type}
                          </Badge>
                          <span className="min-w-0 flex-1 truncate">{item.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            <Link
              href="/calendar"
              className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              View full calendar →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {(Object.entries(STATUS_LABELS) as [ContentStatus, string][]).map(([status, label]) => (
          <Card key={status}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold">{counts[status] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasAnyAccounts && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground">Followers</p>
                <p className="text-2xl font-semibold">
                  {followerTotals.followers.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground">Following</p>
                <p className="text-2xl font-semibold">
                  {followerTotals.following.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="pt-5">
                <h2 className="mb-4 text-sm font-semibold">Follower growth</h2>
                <LineChart points={followerSeries} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <h2 className="mb-4 text-sm font-semibold">Engagement over time</h2>
                <LineChart points={engagementSeries} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" />
            Engagement alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAnyMetrics ? (
            <p className="text-sm text-muted-foreground">
              No real metrics yet - connect a platform in Social Hub to start seeing engagement
              data here.
            </p>
          ) : highEngagement.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing over 500 interactions in this period.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {highEngagement.map(({ content, interactions }) => (
                <li key={content.id} className="flex items-center gap-3 py-2.5">
                  {content.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={content.thumbnailUrl}
                      alt=""
                      className="size-10 shrink-0 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-10 shrink-0 rounded bg-muted" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {content.title}
                  </span>
                  <Badge variant="success" className="shrink-0">
                    {interactions.toLocaleString()} interactions
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

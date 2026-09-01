import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import {
  getSocialHubData,
  getConnectedSocialAccountCount,
  getFollowerGrowthByPlatform,
} from "@/lib/social";
import { getCommentsForBrand, getMentionsFromComments } from "@/lib/comments";
import { getAutoRepostQueue, getIdeas } from "@/lib/content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, AtSign, BadgeCheck, Users, CalendarClock, Lightbulb, BarChart3 } from "lucide-react";
import { CommentsPanel } from "@/components/social/comments-panel";
import { CancelRepostButton } from "@/components/social/cancel-repost-button";
import { MultiLineChart, CHART_COLOR_VARS } from "@/components/charts/multi-line-chart";
import { IdeaQuickCapture } from "@/components/content/idea-quick-capture";
import { IdeaCard } from "@/components/content/idea-card";
import { DisconnectButton } from "./disconnect-button";
import { SyncButton } from "./sync-button";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

const PLATFORMS: {
  key: SocialPlatform;
  label: string;
  initials: string;
  live: boolean;
  connectPath?: string;
}[] = [
  { key: "instagram", label: "Instagram", initials: "IG", live: true, connectPath: "/auth/instagram/start" },
  { key: "tiktok", label: "TikTok", initials: "TT", live: true, connectPath: "/auth/tiktok/start" },
  { key: "x", label: "X", initials: "X", live: false },
  { key: "youtube", label: "YouTube", initials: "YT", live: false },
  { key: "linkedin", label: "LinkedIn", initials: "LI", live: false },
];

export default async function SocialHubPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const [{ accounts, platformTotals, totals, engagementRate }, followerGrowth, autoRepost, ideas, comments, mentions] =
    await Promise.all([
      getSocialHubData(ctx.brand.id),
      getFollowerGrowthByPlatform(ctx.brand.id),
      getAutoRepostQueue(ctx.brand.id),
      getIdeas(ctx.brand.id),
      getCommentsForBrand(ctx.brand.id),
      getMentionsFromComments(ctx.brand.id),
    ]);

  const accountsByPlatform = new Map(accounts.map((a) => [a.platform, a]));

  const isStarter = ctx.workspace.plan === "starter";
  const connectedCount = isStarter ? await getConnectedSocialAccountCount(ctx.workspace.id) : 0;
  const starterLimitReached = isStarter && connectedCount >= 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Social Hub</h1>
          <p className="text-sm text-muted-foreground">
            Automate, monitor and grow across all platforms.
            {isStarter && " Starter includes 1 connected account (Instagram or TikTok)."}
          </p>
        </div>
        {accounts.length === 0 && (
          <Badge variant="warning" className="shrink-0">
            Not connected - connect an account to go live
          </Badge>
        )}
      </div>

      {connected && <p className="text-sm text-success">Connected {connected} successfully.</p>}
      {error === "starter_limit" ? (
        <p className="text-sm text-destructive">
          Starter is limited to 1 connected account - disconnect the other one first, or{" "}
          <a href="/settings" className="underline">
            upgrade to Pro
          </a>{" "}
          for unlimited accounts.
        </p>
      ) : (
        error && (
          <p className="text-sm text-destructive">
            Something went wrong connecting that account ({error}). Try again.
          </p>
        )
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PLATFORMS.map((platform, i) => {
          const account = accountsByPlatform.get(platform.key);
          const colorVar = CHART_COLOR_VARS[i % CHART_COLOR_VARS.length];
          return (
            <Card key={platform.key}>
              <CardContent className="flex flex-col gap-3 pt-5">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
                    style={{ background: `var(${colorVar})` }}
                  >
                    {platform.initials}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-sm font-medium">{platform.label}</span>
                      {account && <BadgeCheck className="size-3.5 shrink-0 text-success" />}
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      {account?.externalUsername
                        ? `@${account.externalUsername}`
                        : platform.live
                          ? "Not connected"
                          : "Coming soon"}
                    </span>
                  </div>
                </div>

                {account && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Users className="size-3.5 text-muted-foreground" />
                    <span className="font-semibold">{(account.followersCount ?? 0).toLocaleString()}</span>
                  </div>
                )}

                {account ? (
                  <div className="flex items-center gap-2">
                    <SyncButton id={account.id} />
                    <DisconnectButton id={account.id} />
                  </div>
                ) : platform.live && starterLimitReached ? (
                  <Button size="sm" variant="outline" disabled title="Starter is limited to 1 connected account">
                    Connect
                  </Button>
                ) : platform.live ? (
                  <Button size="sm" asChild>
                    <a href={platform.connectPath}>Connect</a>
                  </Button>
                ) : (
                  <Button size="sm" disabled>
                    Connect
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="kpis">
        <TabsList>
          <TabsTrigger value="kpis">
            <BarChart3 className="size-4" />
            KPIs
          </TabsTrigger>
          <TabsTrigger value="auto-repost">
            <CalendarClock className="size-4" />
            Auto-Repost
          </TabsTrigger>
          <TabsTrigger value="comments">
            <MessageCircle className="size-4" />
            Comments
          </TabsTrigger>
          <TabsTrigger value="ai-ideas">
            <Lightbulb className="size-4" />
            AI Ideas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kpis" className="flex flex-col gap-4">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Connect an account above and its real metrics start flowing in here.
            </p>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Follower Growth by Platform</CardTitle>
                </CardHeader>
                <CardContent>
                  <MultiLineChart
                    series={followerGrowth.map((row) => {
                      const i = PLATFORMS.findIndex((p) => p.key === row.platform);
                      return {
                        key: row.platform,
                        label: PLATFORMS[i]?.label ?? row.platform,
                        points: row.series,
                        colorVar: CHART_COLOR_VARS[i % CHART_COLOR_VARS.length],
                      };
                    })}
                  />
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  label="Total Followers"
                  value={totals.followers.toLocaleString()}
                  colorVar="--chart-1"
                  caption="across all platforms"
                />
                <StatCard
                  label="Total Reach"
                  value={totals.reach.toLocaleString()}
                  colorVar="--chart-5"
                  caption="lifetime, synced posts"
                />
                <StatCard
                  label="Total Likes"
                  value={totals.likes.toLocaleString()}
                  colorVar="--chart-3"
                  caption="across all posts"
                />
                <StatCard
                  label="Avg Engagement"
                  value={engagementRate !== null ? `${engagementRate.toFixed(1)}%` : "-"}
                  colorVar="--chart-4"
                  caption="interactions / followers"
                />
              </div>

              {platformTotals.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {platformTotals.map((row) => {
                    const meta = PLATFORMS.find((p) => p.key === row.platform);
                    return (
                      <Card key={row.platform}>
                        <CardContent className="flex flex-col gap-2 pt-5">
                          <span className="text-sm font-medium">{meta?.label ?? row.platform}</span>
                          <div className="grid grid-cols-2 gap-2">
                            <Stat label="Posts" value={row.posts} />
                            <Stat label="Likes" value={row.likes} />
                            <Stat label="Comments" value={row.comments} />
                            <Stat label="Reach" value={row.reach} />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="auto-repost">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="size-4 text-primary" />
                Scheduled Reposts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {autoRepost.scheduled.length === 0 && autoRepost.done.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing scheduled yet -{" "}
                  <Link href="/calendar" className="underline">
                    schedule a post from the Calendar
                  </Link>
                  .
                </p>
              ) : (
                <div className="flex flex-col divide-y">
                  {autoRepost.scheduled.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {item.platforms.map((p) => (
                            <Badge key={p} variant="secondary" className="capitalize">
                              {p}
                            </Badge>
                          ))}
                          {item.scheduledAt && <span>{new Date(item.scheduledAt).toLocaleString()}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge>Scheduled</Badge>
                        <CancelRepostButton id={item.id} />
                      </div>
                    </div>
                  ))}
                  {autoRepost.done.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {item.platforms.map((p) => (
                            <Badge key={p} variant="secondary" className="capitalize">
                              {p}
                            </Badge>
                          ))}
                          {item.publishedAt && <span>{new Date(item.publishedAt).toLocaleString()}</span>}
                        </div>
                      </div>
                      <Badge variant="success" className="shrink-0">
                        Done
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="size-4 text-primary" />
                  Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CommentsPanel comments={comments} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AtSign className="size-4 text-primary" />
                  Mentions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">
                  Instagram doesn&apos;t expose who reposted your content - this shows real @handles
                  people use inside comments on your posts instead.
                </p>
                {mentions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No mentions found in comments yet.</p>
                ) : (
                  <ul className="flex flex-col divide-y">
                    {mentions.map((m) => (
                      <li key={m.handle} className="flex items-center justify-between py-2 text-sm">
                        <span className="font-medium">@{m.handle}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.count} mention{m.count !== 1 ? "s" : ""} - last by @{m.lastBy}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-ideas" className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Every idea captured here lives in your Ideas Bank too, ready to turn into a scheduled post.
          </p>
          <IdeaQuickCapture />
          {ideas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ideas captured yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ideas.slice(0, 6).map((idea) => (
                  <IdeaCard key={idea.id} idea={idea} />
                ))}
              </div>
              {ideas.length > 6 && (
                <Link href="/ideas" className="text-sm font-medium text-primary hover:underline">
                  See all {ideas.length} ideas in the Ideas Bank →
                </Link>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{(value ?? 0).toLocaleString()}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  colorVar,
  caption,
}: {
  label: string;
  value: string;
  colorVar: string;
  caption?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold" style={{ color: `var(${colorVar})` }}>
          {value}
        </p>
        {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
      </CardContent>
    </Card>
  );
}

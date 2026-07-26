import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getSocialAccountsForBrand } from "@/lib/social";
import { getAnalyticsData } from "@/lib/analytics";
import { getBrandAudienceDemographics } from "@/lib/demographics";
import { resolveDateRange } from "@/lib/date-range";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/brand/logo";
import { ExportMediaKitButton } from "./export-button";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

const TYPE_LABELS: Record<string, string> = {
  post: "Post",
  reel: "Reel",
  carousel: "Carousel",
  video: "Video",
  story: "Story",
};

function pct(n: number | null) {
  return n === null ? "—" : `${n.toFixed(1)}%`;
}

export default async function MediaKitPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const accounts = await getSocialAccountsForBrand(ctx.brand.id);
  const connected = accounts
    .filter((a) => a.status === "connected")
    .sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0));

  if (connected.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Media Kit</h1>
        <p className="text-sm text-muted-foreground">
          Connect at least one social account to generate your media kit - we need real audience
          and performance data to fill it in.
        </p>
        <Button asChild className="w-fit">
          <Link href="/social-hub">Go to Social Hub</Link>
        </Button>
      </div>
    );
  }

  const range = resolveDateRange({ range: "90d" });
  const [analytics, demographics] = await Promise.all([
    getAnalyticsData(ctx.brand.id, range),
    getBrandAudienceDemographics(ctx.brand.id),
  ]);

  const totalFollowers = connected.reduce((sum, a) => sum + (a.followersCount ?? 0), 0);
  const topPosts = analytics.perPost.slice(0, 5);
  const bio =
    ctx.workspace.discoveryBio ??
    (ctx.workspace.discoveryNiche ? `Focus: ${ctx.workspace.discoveryNiche}` : null);
  const contactEmail = ctx.workspace.discoveryContactEmail ?? user.email ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between print-hide">
        <div>
          <h1 className="text-2xl font-semibold">Media Kit</h1>
          <p className="text-sm text-muted-foreground">
            Ready to send to brands - real data from {ctx.brand.name}, last {range.label}.
          </p>
        </div>
        <ExportMediaKitButton />
      </div>

      {/* Page 1 - one cover per connected account, each with that
          platform's own profile photo and follower count - never a
          blended photo/number across accounts that look different. */}
      {connected.map((account) => (
        <section
          key={account.id}
          className="print-page flex min-h-[70vh] flex-col items-center justify-center gap-6 rounded-lg border bg-card p-12 text-center"
        >
          <Logo size="sm" />
          <Avatar className="size-32 border">
            <AvatarImage src={account.profilePictureUrl ?? undefined} alt="" />
            <AvatarFallback className="text-2xl">
              {ctx.brand.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight">
              {ctx.brand.name}
            </h2>
            <div className="mt-2 flex justify-center">
              <Badge variant="outline">
                {account.externalUsername ? `@${account.externalUsername}` : "—"} ·{" "}
                {PLATFORM_LABELS[account.platform]}
              </Badge>
            </div>
          </div>
          {bio && <p className="max-w-md text-sm text-muted-foreground">{bio}</p>}
          <div>
            <p className="text-5xl font-extrabold tracking-tight text-primary">
              {(account.followersCount ?? 0).toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              {PLATFORM_LABELS[account.platform]} followers
            </p>
          </div>
        </section>
      ))}

      {/* Page 2 - Analytics */}
      <section className="print-page flex flex-col gap-5 rounded-lg border bg-card p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Performance</h2>
          <p className="text-xs text-muted-foreground">Last {range.label}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Followers</p>
              <p className="text-2xl font-semibold">{totalFollowers.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Engagement rate</p>
              <p className="text-2xl font-semibold">{pct(analytics.engagementRates.byFollowers)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Interactions</p>
              <p className="text-2xl font-semibold">
                {(analytics.totals.likes + analytics.totals.comments + analytics.totals.shares + analytics.totals.saved).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Reach</p>
              <p className="text-2xl font-semibold">{analytics.totals.reach.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Video views</p>
              <p className="text-2xl font-semibold">{analytics.totals.videoViews.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Posts published</p>
              <p className="text-2xl font-semibold">{analytics.perPost.length.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {connected.length > 1 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">By platform</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {connected.map((a) => (
                <Card key={a.id}>
                  <CardContent className="flex items-center justify-between gap-3 pt-5">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9 border">
                        <AvatarImage src={a.profilePictureUrl ?? undefined} alt="" />
                        <AvatarFallback className="text-xs">
                          {PLATFORM_LABELS[a.platform].slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{PLATFORM_LABELS[a.platform]}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.externalUsername ? `@${a.externalUsername}` : "—"}
                        </p>
                      </div>
                    </div>
                    <p className="text-xl font-semibold">
                      {(a.followersCount ?? 0).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {topPosts.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Top posts</h3>
            <div className="flex flex-col divide-y rounded-md border">
              {topPosts.map((p) => (
                <div key={p.contentId} className="flex items-center gap-3 p-3">
                  {p.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnailUrl}
                      alt=""
                      className="size-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="size-12 shrink-0 rounded bg-muted" />
                  )}
                  <div className="flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <Badge variant="outline" className="mt-0.5 text-[10px] capitalize">
                      {TYPE_LABELS[p.type] ?? p.type}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold">
                    {p.interactions.toLocaleString()} <span className="text-xs text-muted-foreground">interactions</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {demographics.hasData && (
          <div className="grid gap-4 sm:grid-cols-2">
            {demographics.age.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Audience age</h3>
                <div className="flex flex-col gap-1.5">
                  {demographics.age.map((d) => (
                    <div key={d.label} className="flex items-center gap-2 text-xs">
                      <span className="w-14 shrink-0 text-muted-foreground">{d.label}</span>
                      <div className="h-2 flex-1 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${d.percent}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right">{d.percent.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {demographics.topCountries.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Top countries</h3>
                <div className="flex flex-col gap-1.5">
                  {demographics.topCountries.map((d) => (
                    <div key={d.label} className="flex items-center gap-2 text-xs">
                      <span className="w-24 shrink-0 truncate text-muted-foreground">{d.label}</span>
                      <div className="h-2 flex-1 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${d.percent}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right">{d.percent.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Page 3 - Thank you / signature */}
      <section className="print-page flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-lg border bg-card p-12 text-center">
        <h2 className="font-display text-2xl font-bold">Thanks for your interest!</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          These numbers reflect {ctx.brand.name}&apos;s real activity. Let&apos;s talk about the
          next collaboration?
        </p>
        {contactEmail && <p className="text-sm font-medium">{contactEmail}</p>}
        <div className="mt-6 flex flex-col items-center gap-1">
          <Logo size="sm" />
          <p className="text-xs text-muted-foreground">
            Media kit generated on {new Date().toLocaleDateString()}
          </p>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getSocialAccountsForBrand } from "@/lib/social";
import { getAnalyticsData } from "@/lib/analytics";
import { getBrandAudienceDemographics } from "@/lib/demographics";
import { resolveDateRange, DASHBOARD_RANGES } from "@/lib/date-range";
import { buildMediaKit, SCORE_GLOSSARY, type KitMetric } from "@/lib/media-kit";
import { Button } from "@/components/ui/button";
import { LineChart } from "@/components/charts/line-chart";
import { Logo } from "@/components/brand/logo";
import { ExportMediaKitButton } from "./export-button";
import { PitchAssistant } from "@/components/media-kit/pitch-assistant";
import {
  KitHeader,
  SectionTitle,
  MetricCard,
  MetricGroupCard,
  BarList,
  AgeBars,
  GenderDonut,
  ScoreRing,
  PostRow,
} from "@/components/media-kit/kit-blocks";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

const RANGE_KEY = "90d";

function num(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function pct(value: number | null | undefined, digits = 2) {
  return value === null || value === undefined ? "—" : `${value.toFixed(digits)}%`;
}

function metricValue(metric: KitMetric) {
  if (metric.value === null) return "—";
  if (metric.kind === "percent") return pct(metric.value);
  if (metric.kind === "decimal") return num(metric.value, 2);
  return num(Math.round(metric.value));
}

function shareOf(part: number, total: number) {
  return total > 0 ? `${((part / total) * 100).toFixed(2)}%` : null;
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

  const range = resolveDateRange({ range: RANGE_KEY });
  const days = DASHBOARD_RANGES[RANGE_KEY].days;
  const [analytics, demographics] = await Promise.all([
    getAnalyticsData(ctx.brand.id, range),
    getBrandAudienceDemographics(ctx.brand.id),
  ]);

  const followers = connected.reduce((sum, a) => sum + (a.followersCount ?? 0), 0);
  const kit = buildMediaKit({ analytics, followers, days });
  const { overview, engagement } = kit;

  const lead = connected[0];
  const topCountry = demographics.topCountries[0]?.label ?? null;
  const topAge = demographics.age.length
    ? [...demographics.age].sort((a, b) => b.percent - a.percent)[0].label
    : null;

  const tags = [
    ctx.workspace.discoveryNiche,
    ...connected.map((a) => PLATFORM_LABELS[a.platform]),
  ].filter((t): t is string => Boolean(t));

  const rangeLabel = `${range.start.toLocaleDateString(undefined, {
    month: "long",
    day: "2-digit",
    year: "numeric",
  })} - ${range.end.toLocaleDateString(undefined, {
    month: "long",
    day: "2-digit",
    year: "numeric",
  })}`;

  const headerProps = {
    name: ctx.brand.name,
    handle: lead.externalUsername,
    meta: [topCountry, topAge].filter(Boolean).join(" · ") || null,
    tags,
    avatarUrl: lead.profilePictureUrl,
    score: kit.score,
    rangeLabel,
  };

  const contactEmail = ctx.workspace.discoveryContactEmail ?? user.email ?? null;
  const bio =
    ctx.workspace.discoveryBio ??
    (ctx.workspace.discoveryNiche ? `Focus: ${ctx.workspace.discoveryNiche}` : null);
  const topPosts = analytics.perPost.slice(0, 5);

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

      <PitchAssistant />

      {/* Page 1 - profile header, overview and engagement. Each print-page
          section repeats the header band the way the reference kits do, so a
          brand reading page 4 of the PDF still knows whose numbers these are. */}
      <section className="print-page flex flex-col gap-8 rounded-xl border bg-card p-8 print:rounded-none print:border-0 print:p-0">
        <KitHeader {...headerProps} />
        {bio && <p className="max-w-2xl text-sm text-muted-foreground">{bio}</p>}

        <div className="flex flex-col gap-4">
          <SectionTitle title="Overview" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total of followers"
              value={num(overview.followers)}
              delta={overview.followerGrowthPercent !== null ? pct(overview.followerGrowthPercent) : null}
              deltaTone={
                overview.followerGrowthPercent === null
                  ? "neutral"
                  : overview.followerGrowthPercent < 0
                    ? "down"
                    : "up"
              }
              footValue={
                overview.followerGrowthPerDay !== null
                  ? num(overview.followerGrowthPerDay, 2)
                  : null
              }
              footLabel="Avg. growth per day"
            />
            <MetricCard
              label="Total of feed posts"
              value={num(overview.feedPosts)}
              delta={shareOf(overview.feedPosts, overview.totalPosts)}
              footValue={num(overview.feedPosts / days, 2)}
              footLabel="Avg. per day"
            />
            <MetricCard
              label="Total of stories"
              value={num(overview.stories)}
              delta={shareOf(overview.stories, overview.totalPosts)}
              footValue={num(overview.stories / days, 2)}
              footLabel="Avg. per day"
            />
            <MetricCard
              label="Total of reels"
              value={num(overview.reels)}
              delta={shareOf(overview.reels, overview.totalPosts)}
              footValue={num(overview.reels / days, 2)}
              footLabel="Avg. per day"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Impressions" value={num(overview.impressions)} />
            <MetricCard label="Total reach" value={num(overview.reach)} />
          </div>

          <MetricGroupCard
            label="Virality rate"
            items={[
              { value: num(overview.impressions), caption: "Total impressions" },
              { value: num(overview.interactions), caption: "Total engagement" },
              { value: pct(overview.viralityRate), caption: "Virality rate" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle title="Engagement" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Engagement rate" value={pct(engagement.engagementRate)} />
            <MetricCard
              label="Engagement per 1k followers"
              value={num(engagement.engagementPer1kFollowers, 2)}
            />
            <MetricCard label="Total engagement" value={num(overview.interactions)} />
            <MetricCard
              label="Total likes"
              value={num(engagement.likes)}
              delta={shareOf(engagement.likes, overview.interactions)}
              footValue={num(engagement.avgLikes, 1)}
              footLabel="Avg. per post"
            />
            <MetricCard
              label="Total comments"
              value={num(engagement.comments)}
              delta={shareOf(engagement.comments, overview.interactions)}
              footValue={num(engagement.avgComments, 1)}
              footLabel="Avg. per post"
            />
            <MetricCard
              label="Total saves"
              value={num(engagement.saves)}
              delta={shareOf(engagement.saves, overview.interactions)}
              footValue={num(engagement.avgSaves, 1)}
              footLabel="Avg. per post"
            />
          </div>
        </div>
      </section>

      {/* Page 2 - per-format analysis. Formats with no content in the window
          simply don't appear, rather than printing a wall of zeros. */}
      {kit.formats.length > 0 && (
        <section className="print-page flex flex-col gap-8 rounded-xl border bg-card p-8 print:rounded-none print:border-0 print:p-0">
          <KitHeader {...headerProps} compact className="print-only" />
          {kit.formats.map((format) => (
            <div key={format.key} className="flex flex-col gap-4">
              <SectionTitle
                eyebrow="Posts"
                title={format.title}
                subtitle={format.subtitle}
              />
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {format.metrics.map((metric) => (
                  <MetricCard
                    key={metric.label}
                    label={metric.label}
                    value={metricValue(metric)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Page 3 - audience */}
      {(demographics.hasData || analytics.followerSeries.length > 1) && (
        <section className="print-page flex flex-col gap-8 rounded-xl border bg-card p-8 print:rounded-none print:border-0 print:p-0">
          <KitHeader {...headerProps} compact className="print-only" />
          <SectionTitle
            eyebrow="Followers"
            title="Audience"
            subtitle="Audience data separated by age, gender, country and city."
          />

          {analytics.followerSeries.length > 1 && (
            <div className="flex flex-col gap-4 rounded-xl border p-5">
              <span className="text-sm text-muted-foreground">Growth of followers</span>
              <LineChart points={analytics.followerSeries} />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {demographics.age.length > 0 && <AgeBars items={demographics.age} />}
            {demographics.gender.length > 0 && <GenderDonut items={demographics.gender} />}
            {demographics.topCountries.length > 0 && (
              <BarList
                title="Followers by country"
                items={demographics.topCountries.map((d) => ({
                  label: d.label,
                  value: num(d.value),
                  percent: d.percent,
                }))}
              />
            )}
            {demographics.topCities.length > 0 && (
              <BarList
                title="Followers by city"
                items={demographics.topCities.map((d) => ({
                  label: d.label,
                  value: num(d.value),
                  percent: d.percent,
                }))}
              />
            )}
          </div>

          {!demographics.hasData && (
            <p className="text-sm text-muted-foreground">
              Audience demographics aren&apos;t available for the connected platform yet - TikTok
              doesn&apos;t expose them to third-party apps, so this section fills in once an
              Instagram account is connected.
            </p>
          )}
        </section>
      )}

      {/* Page 4 - top posts */}
      {topPosts.length > 0 && (
        <section className="print-page flex flex-col gap-6 rounded-xl border bg-card p-8 print:rounded-none print:border-0 print:p-0">
          <KitHeader {...headerProps} compact className="print-only" />
          <SectionTitle
            title="Posts"
            subtitle="Listing of posts with associated performance information, ordered by engagement."
          />
          <div className="flex flex-col gap-3">
            {topPosts.map((post) => (
              <PostRow
                key={post.contentId}
                thumbnailUrl={post.thumbnailUrl}
                title={post.title}
                publishedAt={post.publishedAt}
                likes={post.likes}
                comments={post.comments}
                saves={post.saved}
                engagement={post.interactions}
                hashtags={post.hashtags}
                mentions={post.mentions.length}
                reach={post.reach}
                impressions={post.impressions}
              />
            ))}
          </div>
        </section>
      )}

      {/* Page 5 - influencer score + glossary */}
      <section className="print-page flex flex-col gap-8 rounded-xl border bg-card p-8 print:rounded-none print:border-0 print:p-0">
        <KitHeader {...headerProps} compact className="print-only" />
        <div className="flex flex-col gap-4">
          <SectionTitle
            title="Influencer score"
            subtitle="A single read on profile health, built from the five components below."
          />
          <ScoreRing score={kit.score} components={kit.scoreComponents} />
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle title="Glossary" />
          <dl className="grid gap-4 sm:grid-cols-2">
            {SCORE_GLOSSARY.map((entry) => (
              <div key={entry.term} className="flex flex-col gap-1">
                <dt className="text-sm font-medium">{entry.term}</dt>
                <dd className="text-sm text-muted-foreground">{entry.definition}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col items-center gap-2 border-t pt-6 text-center">
          <p className="text-sm font-medium">Let&apos;s talk about the next collaboration?</p>
          {contactEmail && <p className="text-sm text-muted-foreground">{contactEmail}</p>}
          <Logo size="sm" />
          <p className="text-xs text-muted-foreground">
            Based on information from {range.start.toISOString().slice(0, 10)} to{" "}
            {range.end.toISOString().slice(0, 10)} ({days} days).
          </p>
        </div>
      </section>
    </div>
  );
}

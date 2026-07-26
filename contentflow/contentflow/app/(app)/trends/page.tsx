import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { planAtLeast } from "@/lib/plan";
import { resolveDateRange, type ResolvedRange } from "@/lib/date-range";
import { getInternalTrends } from "@/lib/trends-internal";
import { getNicheTrends } from "@/lib/trends-niche";
import { canAccessTrends } from "@/lib/trends-access";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import { GrowthBadge } from "@/components/analytics/growth-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/lib/generated/prisma/enums";

const TYPE_LABELS: Record<ContentType, string> = {
  post: "Post",
  reel: "Reel",
  video: "Video",
  carousel: "Carousel",
  story: "Story",
};

const TABS = [
  { key: "format", label: "By format" },
  { key: "hashtag", label: "By hashtag" },
  { key: "niche", label: "Vs. competitors" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function tabHref(tab: TabKey, range: ResolvedRange, params: { from?: string; to?: string }) {
  const qs = new URLSearchParams({ tab, range: range.key });
  if (range.key === "custom") {
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
  }
  return `/trends?${qs.toString()}`;
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; tab?: string }>;
}) {
  const params = await searchParams;

  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;
  if (!planAtLeast(ctx.workspace.plan, "pro")) redirect("/settings?upgrade=1");

  const range = resolveDateRange(params);
  const tab: TabKey = params.tab === "hashtag" ? "hashtag" : params.tab === "niche" ? "niche" : "format";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Trends</h1>
        <p className="text-sm text-muted-foreground">
          How your own formats and hashtags are performing, period over period.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md border p-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={tabHref(t.key, range, params)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium",
                tab === t.key ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <DateRangePicker basePath="/trends" current={range} extraParams={{ tab }} />
      </div>

      {tab === "niche" ? (
        <NicheTab workspaceId={ctx.workspace.id} brandId={ctx.brand.id} plan={ctx.workspace.plan} range={range} />
      ) : (
        <InternalTab brandId={ctx.brand.id} range={range} tab={tab} />
      )}
    </div>
  );
}

async function InternalTab({
  brandId,
  range,
  tab,
}: {
  brandId: string;
  range: ResolvedRange;
  tab: "format" | "hashtag";
}) {
  const trends = await getInternalTrends(brandId, range);
  const rows = tab === "format" ? trends.byFormat : trends.byHashtag;

  return (
    <Card>
      <CardContent className="pt-5">
        {!trends.hasEnoughData ? (
          <p className="text-sm text-muted-foreground">
            Not enough posts yet to calculate trends. Publish at least 5 posts to start seeing patterns.
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tab === "hashtag"
              ? "No hashtags found in this period's captions."
              : "No published posts in this period."}
          </p>
        ) : (
          <div className="flex flex-col divide-y">
            {rows.map((row) => (
              <div key={String(row.key)} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {tab === "format" ? TYPE_LABELS[row.key as ContentType] : `#${row.key}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.count} {row.count === 1 ? "post" : "posts"} · avg{" "}
                    {Math.round(row.avgInteractions).toLocaleString()} interactions
                  </p>
                </div>
                <GrowthBadge value={row.growthPercent} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function NicheTab({
  workspaceId,
  brandId,
  plan,
  range,
}: {
  workspaceId: string;
  brandId: string;
  plan: "starter" | "pro" | "studio";
  range: ResolvedRange;
}) {
  if (!canAccessTrends(plan, "niche")) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 pt-5">
          <p className="text-sm text-muted-foreground">
            Comparing your formats and hashtags against competitors is available on the Studio plan.
          </p>
          <Button asChild size="sm">
            <Link href="/settings?upgrade=1">Upgrade to Studio</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const niche = await getNicheTrends(workspaceId, brandId, range);

  if (!niche.hasCompetitors) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 pt-5">
          <p className="text-sm text-muted-foreground">
            Add competitors in Competitors to unlock this view.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/competitors">Go to Competitors</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Your strongest formats</h2>
          {niche.yourFormats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published posts in this period.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {niche.yourFormats.map((row) => (
                <div key={row.key} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium">{TYPE_LABELS[row.key]}</span>
                  <span className="text-xs text-muted-foreground">
                    avg {Math.round(row.avgInteractions).toLocaleString()} · {row.count}{" "}
                    {row.count === 1 ? "post" : "posts"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">What competitors are posting</h2>
          {niche.competitorFormats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No competitor posts logged in this period.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {niche.competitorFormats.map((row) => (
                <div key={row.key} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium">{TYPE_LABELS[row.key]}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.count} {row.count === 1 ? "post" : "posts"} logged
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Your strongest hashtags</h2>
          {niche.yourHashtags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hashtags found in this period&apos;s captions.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {niche.yourHashtags.map((row) => (
                <div key={row.key} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium">#{row.key}</span>
                  <span className="text-xs text-muted-foreground">
                    avg {Math.round(row.avgInteractions).toLocaleString()} · {row.count}{" "}
                    {row.count === 1 ? "post" : "posts"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Competitor hashtags</h2>
          {niche.competitorHashtags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No competitor posts logged in this period.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {niche.competitorHashtags.map((row) => (
                <div key={row.key} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium">#{row.key}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.count} {row.count === 1 ? "post" : "posts"} logged
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

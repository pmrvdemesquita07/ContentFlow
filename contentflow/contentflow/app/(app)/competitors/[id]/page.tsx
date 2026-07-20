import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getCompetitorDetail } from "@/lib/competitors";
import { planAtLeast } from "@/lib/plan";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import { GrowthBadge } from "@/components/analytics/growth-badge";
import { AddSnapshotForm } from "./add-snapshot-form";
import { DeleteCompetitorButton } from "./delete-competitor-button";
import { DeleteSnapshotButton } from "./delete-snapshot-button";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

export default async function CompetitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;
  if (!planAtLeast(ctx.workspace.plan, "pro")) redirect("/settings?upgrade=1");

  const competitor = await getCompetitorDetail(id, ctx.workspace.id);
  if (!competitor) notFound();

  const followerSeries = competitor.snapshots.map((s) => ({
    label: s.capturedAt.toLocaleDateString(),
    value: s.followersCount,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{competitor.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {PLATFORM_LABELS[competitor.platform]} - @{competitor.handle}
          </p>
        </div>
        <DeleteCompetitorButton competitorId={competitor.id} />
      </div>

      {competitor.notes && (
        <Card>
          <CardContent className="pt-5">
            <h2 className="mb-2 text-sm font-semibold">Notes</h2>
            <p className="text-sm text-muted-foreground">{competitor.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Followers</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold">
                {competitor.latest ? competitor.latest.followersCount.toLocaleString() : "-"}
              </p>
              {competitor.latest && <GrowthBadge value={competitor.followerGrowth} />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Posts</p>
            <p className="text-2xl font-semibold">
              {competitor.latest?.postsCount != null
                ? competitor.latest.postsCount.toLocaleString()
                : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-4 text-sm font-semibold">Followers over time</h2>
          <LineChart points={followerSeries} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Check-ins</h2>
          {competitor.snapshots.length === 0 ? (
            <p className="mb-3 text-sm text-muted-foreground">
              No check-ins yet - add the first one below.
            </p>
          ) : (
            <div className="mb-4 flex flex-col divide-y">
              {[...competitor.snapshots].reverse().map((snap) => (
                <div key={snap.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-sm font-medium">
                    {snap.followersCount.toLocaleString()} followers
                  </span>
                  {snap.postsCount != null && (
                    <span className="text-xs text-muted-foreground">
                      {snap.postsCount.toLocaleString()} posts
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {snap.capturedAt.toLocaleDateString()}
                  </span>
                  <div className="ml-auto">
                    <DeleteSnapshotButton snapshotId={snap.id} competitorId={competitor.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <AddSnapshotForm competitorId={competitor.id} />
        </CardContent>
      </Card>
    </div>
  );
}

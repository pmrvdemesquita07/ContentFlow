import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getCompetitorsForWorkspace } from "@/lib/competitors";
import { planAtLeast } from "@/lib/plan";
import { Card, CardContent } from "@/components/ui/card";
import { GrowthBadge } from "@/components/analytics/growth-badge";
import { NewCompetitorForm } from "./new-competitor-form";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

export default async function CompetitorsPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;
  if (!planAtLeast(ctx.workspace.plan, "pro")) redirect("/settings?upgrade=1");

  const competitors = await getCompetitorsForWorkspace(ctx.workspace.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Competitors</h1>
        <p className="text-sm text-muted-foreground">
          No platform gives third-party apps access to another account&apos;s real metrics, so
          these are tracked manually - add a competitor, then check in periodically with their
          public follower/post count.
        </p>
      </div>

      {competitors.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">
              No competitors tracked yet. Add one below.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitors.map((c) => (
            <Link key={c.id} href={`/competitors/${c.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardContent className="flex flex-col gap-2 pt-5">
                  <h2 className="font-medium">{c.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {PLATFORM_LABELS[c.platform]} - @{c.handle}
                  </p>
                  {c.latest ? (
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-2xl font-semibold">
                        {c.latest.followersCount.toLocaleString()}
                      </p>
                      <GrowthBadge value={c.followerGrowth} />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No check-ins yet</p>
                  )}
                  {c.latest && (
                    <p className="text-xs text-muted-foreground">
                      as of {c.latest.capturedAt.toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card className="max-w-lg">
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Add a competitor</h2>
          <NewCompetitorForm />
        </CardContent>
      </Card>
    </div>
  );
}

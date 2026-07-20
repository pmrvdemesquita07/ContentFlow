import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import {
  getOpportunitiesForWorkspace,
  getOpenOpportunities,
  getMatchesForCreatorWorkspace,
} from "@/lib/opportunities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewOpportunityForm } from "./new-opportunity-form";
import { ApplyForm } from "./apply-form";
import { WithdrawButton } from "./withdraw-button";
import { SearchForm } from "./search-form";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

const MATCH_STATUS_VARIANT: Record<string, "outline" | "success" | "secondary" | "destructive"> = {
  applied: "secondary",
  invited: "secondary",
  accepted: "success",
  rejected: "destructive",
  withdrawn: "outline",
};

function formatBudget(budget: unknown, currency = "EUR") {
  if (budget === null || budget === undefined) return null;
  return Number(budget).toLocaleString(undefined, { style: "currency", currency });
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ niche?: string }>;
}) {
  const params = await searchParams;

  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;

  if (ctx.workspace.type === "creator") {
    const [opportunities, myMatches] = await Promise.all([
      getOpenOpportunities(params.niche),
      getMatchesForCreatorWorkspace(ctx.workspace.id),
    ]);
    const appliedOpportunityIds = new Set(
      myMatches.filter((m) => m.status !== "withdrawn").map((m) => m.opportunityId)
    );

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Opportunities</h1>
          <p className="text-sm text-muted-foreground">
            Briefs posted by brands and agencies. Apply directly - no in-app messaging beyond your
            pitch, contact continues by email once accepted.
          </p>
        </div>

        <SearchForm defaultValue={params.niche ?? ""} />

        {opportunities.length === 0 ? (
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">
                {params.niche ? "No open opportunities match that niche yet." : "No open opportunities right now."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {opportunities.map((o) => {
              const myMatch = myMatches.find((m) => m.opportunityId === o.id);
              const hasApplied = appliedOpportunityIds.has(o.id);
              return (
                <Card key={o.id}>
                  <CardContent className="flex flex-col gap-2 pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-medium">{o.title}</h2>
                      <div className="flex items-center gap-2">
                        {o.niche && <Badge variant="outline">{o.niche}</Badge>}
                        {o.platform && <Badge variant="outline">{PLATFORM_LABELS[o.platform]}</Badge>}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Posted by {o.workspace.name}</p>
                    {o.description && <p className="text-sm text-muted-foreground">{o.description}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {formatBudget(o.budget) && <span>Budget: {formatBudget(o.budget)}</span>}
                      {o.deadline && <span>Deadline: {o.deadline.toLocaleDateString()}</span>}
                    </div>
                    <div className="mt-1">
                      {hasApplied && myMatch ? (
                        <Badge variant={MATCH_STATUS_VARIANT[myMatch.status] ?? "outline"} className="capitalize">
                          {myMatch.status}
                        </Badge>
                      ) : (
                        <ApplyForm opportunityId={o.id} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card>
          <CardContent className="pt-5">
            <h2 className="mb-3 text-sm font-semibold">My applications</h2>
            {myMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">You haven&apos;t applied to anything yet.</p>
            ) : (
              <div className="flex flex-col divide-y">
                {myMatches.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="text-sm font-medium">{m.opportunity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.opportunity.workspace.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={MATCH_STATUS_VARIANT[m.status] ?? "outline"} className="capitalize">
                        {m.status}
                      </Badge>
                      {(m.status === "applied" || m.status === "invited") && (
                        <WithdrawButton matchId={m.id} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const opportunities = await getOpportunitiesForWorkspace(ctx.workspace.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Opportunities</h1>
        <p className="text-sm text-muted-foreground">
          Post a brief and creators can browse and apply directly.
        </p>
      </div>

      {opportunities.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">
              No opportunities posted yet. Create one below.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((o) => (
            <Link key={o.id} href={`/opportunities/${o.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardContent className="flex flex-col gap-2 pt-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-medium">{o.title}</h2>
                    <Badge variant={o.status === "open" ? "success" : "outline"} className="capitalize">
                      {o.status}
                    </Badge>
                  </div>
                  {o.niche && <p className="text-xs text-muted-foreground">{o.niche}</p>}
                  <p className="text-sm text-muted-foreground">
                    {o._count.matches} {o._count.matches === 1 ? "application" : "applications"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card className="max-w-lg">
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Post an opportunity</h2>
          <NewOpportunityForm />
        </CardContent>
      </Card>
    </div>
  );
}

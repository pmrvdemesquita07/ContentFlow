import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getOpportunityDetail } from "@/lib/opportunities";
import { prisma } from "@/lib/db";
import { planAtLeast } from "@/lib/plan";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusSelect } from "./status-select";
import { MatchStatusSelect } from "./match-status-select";
import { DeleteOpportunityButton } from "./delete-opportunity-button";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;
  if (ctx.workspace.type === "creator") redirect("/opportunities");
  if (!planAtLeast(ctx.workspace.plan, "pro")) redirect("/settings?upgrade=1");

  const opportunity = await getOpportunityDetail(id, ctx.workspace.id);
  if (!opportunity) notFound();

  // Accepting a match auto-creates a roster Creator (see updateMatchStatus) -
  // this looks it up so "Create contract" can deep-link straight to it
  // instead of making the agency find the right creator in a dropdown again.
  const acceptedCreatorWorkspaceIds = opportunity.matches
    .filter((m) => m.status === "accepted")
    .map((m) => m.creatorWorkspaceId);
  const linkedCreators = acceptedCreatorWorkspaceIds.length
    ? await prisma.creator.findMany({
        where: { workspaceId: ctx.workspace.id, sourceWorkspaceId: { in: acceptedCreatorWorkspaceIds } },
        select: { id: true, sourceWorkspaceId: true },
      })
    : [];
  const creatorIdByWorkspaceId = new Map(linkedCreators.map((c) => [c.sourceWorkspaceId, c.id]));

  const budget =
    opportunity.budget !== null
      ? Number(opportunity.budget).toLocaleString(undefined, { style: "currency", currency: "EUR" })
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{opportunity.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {opportunity.niche && <Badge variant="outline">{opportunity.niche}</Badge>}
            {opportunity.platform && <Badge variant="outline">{PLATFORM_LABELS[opportunity.platform]}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusSelect opportunityId={opportunity.id} status={opportunity.status} />
          <DeleteOpportunityButton opportunityId={opportunity.id} />
        </div>
      </div>

      {opportunity.description && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">{opportunity.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="text-xl font-semibold">{budget ?? "Not specified"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Deadline</p>
            <p className="text-xl font-semibold">
              {opportunity.deadline ? opportunity.deadline.toLocaleDateString() : "Not specified"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">
            Applications ({opportunity.matches.length})
          </h2>
          {opportunity.matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {opportunity.matches.map((match) => (
                <div key={match.id} className="flex flex-col gap-2 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{match.creatorWorkspace.name}</p>
                      {match.creatorWorkspace.discoveryNiche && (
                        <p className="text-xs text-muted-foreground">
                          {match.creatorWorkspace.discoveryNiche}
                        </p>
                      )}
                    </div>
                    <MatchStatusSelect
                      matchId={match.id}
                      opportunityId={opportunity.id}
                      status={match.status}
                    />
                  </div>
                  {match.message && (
                    <p className="text-sm text-muted-foreground">&ldquo;{match.message}&rdquo;</p>
                  )}
                  {match.status === "accepted" && (
                    <div className="flex items-center gap-3">
                      {match.creatorWorkspace.discoveryContactEmail && (
                        <a
                          href={`mailto:${match.creatorWorkspace.discoveryContactEmail}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Contact {match.creatorWorkspace.discoveryContactEmail}
                        </a>
                      )}
                      {match.thread && (
                        <Link
                          href={`/opportunities/threads/${match.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Message
                        </Link>
                      )}
                      <Link
                        href={`/contracts?creatorId=${creatorIdByWorkspaceId.get(match.creatorWorkspaceId) ?? ""}&title=${encodeURIComponent(opportunity.title)}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Create contract
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

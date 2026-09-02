"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { requireWorkspace } from "@/lib/authz";
import { prisma } from "@/lib/db";
import type { MatchStatus, OpportunityStatus, SocialPlatform } from "@/lib/generated/prisma/enums";

function parseDate(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  return str ? new Date(str) : null;
}

function parseBudget(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number(str);
  return Number.isNaN(n) || n < 0 ? null : n;
}

export async function createOpportunity(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return { error: "Finish onboarding first." };
  if (ctx.workspace.type === "creator") {
    return { error: "Only brand/agency workspaces can post opportunities." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  const platformRaw = String(formData.get("platform") ?? "").trim();

  const opportunity = await prisma.opportunity.create({
    data: {
      workspaceId: ctx.workspace.id,
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      niche: String(formData.get("niche") ?? "").trim() || null,
      platform: platformRaw ? (platformRaw as SocialPlatform) : null,
      budget: parseBudget(formData.get("budget")),
      deadline: parseDate(formData.get("deadline")),
    },
  });

  revalidatePath("/opportunities");
  return { error: undefined, opportunityId: opportunity.id };
}

export async function updateOpportunityStatus(opportunityId: string, status: OpportunityStatus) {
  const ctx = await requireWorkspace("pro");
  if (!ctx) return;
  await prisma.opportunity.updateMany({
    where: { id: opportunityId, workspaceId: ctx.workspace.id },
    data: { status },
  });
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function deleteOpportunity(opportunityId: string) {
  const ctx = await requireWorkspace("pro");
  if (!ctx) return;
  await prisma.opportunity.deleteMany({
    where: { id: opportunityId, workspaceId: ctx.workspace.id },
  });
  revalidatePath("/opportunities");
}

export async function applyToOpportunity(
  opportunityId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return { error: "Finish onboarding first." };
  if (ctx.workspace.type !== "creator") {
    return { error: "Only creator workspaces can apply to opportunities." };
  }

  const existing = await prisma.match.findUnique({
    where: {
      opportunityId_creatorWorkspaceId: {
        opportunityId,
        creatorWorkspaceId: ctx.workspace.id,
      },
    },
  });
  if (existing) return { error: "You've already applied to this opportunity." };

  await prisma.match.create({
    data: {
      opportunityId,
      creatorWorkspaceId: ctx.workspace.id,
      message: String(formData.get("message") ?? "").trim() || null,
    },
  });

  revalidatePath("/opportunities");
  return { error: undefined };
}

export async function withdrawApplication(matchId: string) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.creatorWorkspaceId !== ctx.workspace.id) return;

  await prisma.match.update({
    where: { id: matchId },
    data: { status: "withdrawn", respondedAt: new Date() },
  });
  revalidatePath("/opportunities");
}

export async function updateMatchStatus(matchId: string, opportunityId: string, status: MatchStatus) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return { error: "Finish onboarding first." };

  const existingMatch = await prisma.match.findUnique({
    where: { id: matchId },
    include: { opportunity: { select: { workspaceId: true } } },
  });
  if (!existingMatch) return { error: "Application not found." };

  const isAgencySide = existingMatch.opportunity.workspaceId === ctx.workspace.id;
  const isCreatorSide = existingMatch.creatorWorkspaceId === ctx.workspace.id;
  if (!isAgencySide && !isCreatorSide) return { error: "You don't have access to this application." };

  // The agency reviews pitches it received (applied -> accepted/rejected).
  // A creator only ever gets a say when the agency reached out first
  // (invited -> accepted/rejected) - it can't unilaterally accept its own
  // application, that's still the agency's call.
  const allowedForCreator: MatchStatus[] = ["accepted", "rejected"];
  if (isCreatorSide && !isAgencySide) {
    if (existingMatch.status !== "invited" || !allowedForCreator.includes(status)) {
      return { error: "You can only accept or decline an invitation." };
    }
  }

  const match = await prisma.match.update({
    where: { id: matchId },
    data: { status, respondedAt: new Date() },
    include: {
      opportunity: { select: { workspaceId: true } },
      creatorWorkspace: {
        select: { id: true, name: true, discoveryNiche: true, discoveryContactEmail: true },
      },
    },
  });

  // Accepting is the moment a pitch becomes a real relationship - from here
  // the agency can message the creator and eventually put them under
  // contract, so both need to exist right away instead of the agency having
  // to remember to add them by hand afterwards.
  if (status === "accepted") {
    const agencyWorkspaceId = match.opportunity.workspaceId;
    const existingCreator = await prisma.creator.findFirst({
      where: { workspaceId: agencyWorkspaceId, sourceWorkspaceId: match.creatorWorkspaceId },
    });
    if (!existingCreator) {
      await prisma.creator.create({
        data: {
          workspaceId: agencyWorkspaceId,
          sourceWorkspaceId: match.creatorWorkspaceId,
          name: match.creatorWorkspace.name,
          contactEmail: match.creatorWorkspace.discoveryContactEmail,
          notes: match.creatorWorkspace.discoveryNiche
            ? `Niche: ${match.creatorWorkspace.discoveryNiche}`
            : null,
        },
      });
    }

    await prisma.matchThread.upsert({
      where: { matchId },
      update: {},
      create: { matchId },
    });
  }

  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/opportunities");
  revalidatePath("/creators");
  return { error: undefined };
}

/**
 * The agency-initiated mirror of applyToOpportunity - lets a brand/agency
 * invite a creator it found on Discover straight into one of its own open
 * briefs, instead of only waiting for creators to apply on their own.
 */
export async function inviteCreatorToOpportunity(opportunityId: string, creatorWorkspaceId: string) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return { error: "Finish onboarding first." };
  if (ctx.workspace.type === "creator") {
    return { error: "Only brand/agency workspaces can invite creators." };
  }

  const opportunity = await prisma.opportunity.findFirst({
    where: { id: opportunityId, workspaceId: ctx.workspace.id },
  });
  if (!opportunity) return { error: "Opportunity not found." };

  const existing = await prisma.match.findUnique({
    where: { opportunityId_creatorWorkspaceId: { opportunityId, creatorWorkspaceId } },
  });
  if (existing) return { error: "Already invited or applied to this opportunity." };

  await prisma.match.create({
    data: { opportunityId, creatorWorkspaceId, status: "invited" },
  });

  revalidatePath("/discover");
  revalidatePath(`/opportunities/${opportunityId}`);
  return { error: undefined };
}

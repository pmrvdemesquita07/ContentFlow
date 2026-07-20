"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
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
  await requireUser();
  await prisma.opportunity.update({ where: { id: opportunityId }, data: { status } });
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function deleteOpportunity(opportunityId: string) {
  await requireUser();
  await prisma.opportunity.delete({ where: { id: opportunityId } });
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

  await prisma.match.update({
    where: { id: matchId },
    data: { status: "withdrawn", respondedAt: new Date() },
  });
  revalidatePath("/opportunities");
}

export async function updateMatchStatus(matchId: string, opportunityId: string, status: MatchStatus) {
  await requireUser();
  await prisma.match.update({
    where: { id: matchId },
    data: { status, respondedAt: new Date() },
  });
  revalidatePath(`/opportunities/${opportunityId}`);
}

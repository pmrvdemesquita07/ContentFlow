"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace, planError } from "@/lib/authz";
import { prisma } from "@/lib/db";

export async function createCreator(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const ctx = await requireWorkspace("pro");
  if (!ctx) return planError("pro");
  if (!ctx) return { error: "Finish onboarding first." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Creator name is required." };

  const campaignId = String(formData.get("campaignId") ?? "").trim() || null;

  const creator = await prisma.creator.create({
    data: {
      workspaceId: ctx.workspace.id,
      name,
      contactEmail: String(formData.get("contactEmail") ?? "").trim() || null,
      contactPhone: String(formData.get("contactPhone") ?? "").trim() || null,
      instagramHandle: String(formData.get("instagramHandle") ?? "").trim() || null,
      tiktokHandle: String(formData.get("tiktokHandle") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      ...(campaignId ? { campaigns: { create: { campaignId } } } : {}),
    },
  });

  revalidatePath("/creators");
  if (campaignId) revalidatePath(`/campaigns/${campaignId}`);
  return { error: undefined, creatorId: creator.id };
}

export async function deleteCreator(creatorId: string) {
  const ctx = await requireWorkspace("pro");
  if (!ctx) return;
  await prisma.creator.deleteMany({ where: { id: creatorId, workspaceId: ctx.workspace.id } });
  revalidatePath("/creators");
}

export async function addCreatorToCampaign(creatorId: string, campaignId: string) {
  const ctx = await requireWorkspace("pro");
  if (!ctx) return;
  // The join row carries no workspace, so both sides are checked first.
  const [creator, campaign] = await Promise.all([
    prisma.creator.findFirst({
      where: { id: creatorId, workspaceId: ctx.workspace.id },
      select: { id: true },
    }),
    prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId: ctx.workspace.id },
      select: { id: true },
    }),
  ]);
  if (!creator || !campaign) return;
  await prisma.campaignCreator.create({ data: { creatorId, campaignId } });
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function removeCreatorFromCampaign(creatorId: string, campaignId: string) {
  const ctx = await requireWorkspace("pro");
  if (!ctx) return;
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId: ctx.workspace.id },
    select: { id: true },
  });
  if (!campaign) return;
  await prisma.campaignCreator.delete({
    where: { campaignId_creatorId: { campaignId, creatorId } },
  });
  revalidatePath(`/campaigns/${campaignId}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { prisma } from "@/lib/db";

export async function createCreator(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
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
  await requireUser();
  await prisma.creator.delete({ where: { id: creatorId } });
  revalidatePath("/creators");
}

export async function addCreatorToCampaign(creatorId: string, campaignId: string) {
  await requireUser();
  await prisma.campaignCreator.create({ data: { creatorId, campaignId } });
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function removeCreatorFromCampaign(creatorId: string, campaignId: string) {
  await requireUser();
  await prisma.campaignCreator.delete({
    where: { campaignId_creatorId: { campaignId, creatorId } },
  });
  revalidatePath(`/campaigns/${campaignId}`);
}

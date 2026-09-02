"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace, planError } from "@/lib/authz";
import { prisma } from "@/lib/db";

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

export async function createCampaign(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const ctx = await requireWorkspace("pro");
  if (!ctx) return planError("pro");
  if (!ctx?.brand) return { error: "Finish onboarding before creating a campaign." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Campaign name is required." };

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: ctx.workspace.id,
      brandId: ctx.brand.id,
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      startDate: parseDate(formData.get("startDate")),
      endDate: parseDate(formData.get("endDate")),
      budget: parseBudget(formData.get("budget")),
    },
  });

  revalidatePath("/campaigns");
  return { error: undefined, campaignId: campaign.id };
}

export async function updateCampaign(
  campaignId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const ctx = await requireWorkspace("pro");
  if (!ctx) return planError("pro");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Campaign name is required." };

  await prisma.campaign.updateMany({
    where: { id: campaignId, workspaceId: ctx.workspace.id },
    data: {
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      startDate: parseDate(formData.get("startDate")),
      endDate: parseDate(formData.get("endDate")),
      budget: parseBudget(formData.get("budget")),
    },
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  return { error: undefined };
}

export async function deleteCampaign(campaignId: string) {
  const ctx = await requireWorkspace("pro");
  if (!ctx) return;
  await prisma.campaign.deleteMany({ where: { id: campaignId, workspaceId: ctx.workspace.id } });
  revalidatePath("/campaigns");
}

export async function assignContentToCampaign(contentId: string, campaignId: string) {
  const ctx = await requireWorkspace("pro");
  if (!ctx) return;
  // Both sides have to be the caller's: their own post, their own campaign.
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId: ctx.workspace.id },
    select: { id: true },
  });
  if (!campaign) return;
  await prisma.content.updateMany({
    where: { id: contentId, workspaceId: ctx.workspace.id },
    data: { campaignId },
  });
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function removeContentFromCampaign(contentId: string, campaignId: string) {
  const ctx = await requireWorkspace("pro");
  if (!ctx) return;
  await prisma.content.updateMany({
    where: { id: contentId, workspaceId: ctx.workspace.id },
    data: { campaignId: null },
  });
  revalidatePath(`/campaigns/${campaignId}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
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
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
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
  await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Campaign name is required." };

  await prisma.campaign.update({
    where: { id: campaignId },
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
  await requireUser();
  await prisma.campaign.delete({ where: { id: campaignId } });
  revalidatePath("/campaigns");
}

export async function assignContentToCampaign(contentId: string, campaignId: string) {
  await requireUser();
  await prisma.content.update({ where: { id: contentId }, data: { campaignId } });
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function removeContentFromCampaign(contentId: string, campaignId: string) {
  await requireUser();
  await prisma.content.update({ where: { id: contentId }, data: { campaignId: null } });
  revalidatePath(`/campaigns/${campaignId}`);
}

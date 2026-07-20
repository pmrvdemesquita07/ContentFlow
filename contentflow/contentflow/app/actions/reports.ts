"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { prisma } from "@/lib/db";

export async function createReport(campaignId: string) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return;

  await prisma.report.create({
    data: { campaignId, workspaceId: ctx.workspace.id },
  });

  revalidatePath(`/campaigns/${campaignId}`);
}

export async function revokeReport(reportId: string, campaignId: string) {
  await requireUser();
  await prisma.report.update({
    where: { id: reportId },
    data: { revokedAt: new Date() },
  });
  revalidatePath(`/campaigns/${campaignId}`);
}

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

export async function createReportSubscription(
  campaignId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return { error: "No workspace found." };

  const recipientEmail = String(formData.get("recipientEmail") ?? "").trim();
  const frequency = formData.get("frequency") === "monthly" ? "monthly" : "weekly";

  if (!recipientEmail) return { error: "Email is required." };

  // Reuse an active report link if one already exists for this campaign,
  // so the recipient's bookmarked link never changes across sends.
  let report = await prisma.report.findFirst({
    where: { campaignId, workspaceId: ctx.workspace.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!report) {
    report = await prisma.report.create({
      data: { campaignId, workspaceId: ctx.workspace.id },
    });
  }

  await prisma.reportSubscription.create({
    data: {
      campaignId,
      workspaceId: ctx.workspace.id,
      reportId: report.id,
      recipientEmail,
      frequency,
    },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  return { error: undefined };
}

export async function deleteReportSubscription(subscriptionId: string, campaignId: string) {
  await requireUser();
  await prisma.reportSubscription.delete({ where: { id: subscriptionId } });
  revalidatePath(`/campaigns/${campaignId}`);
}

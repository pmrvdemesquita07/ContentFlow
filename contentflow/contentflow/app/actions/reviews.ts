"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import type { ReviewerRole } from "@/lib/generated/prisma/enums";

export async function submitReview(
  contractId: string,
  reviewerRole: ReviewerRole,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return { error: "Finish onboarding first." };

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { creator: { select: { sourceWorkspaceId: true } } },
  });
  if (!contract) return { error: "Contract not found." };
  if (contract.status !== "completed") {
    return { error: "This contract isn't marked completed yet." };
  }

  // Each side can only rate from the workspace that was actually party to
  // this contract - the agency that issued it, or the creator workspace it
  // was auto-linked to when the marketplace match was accepted.
  const isAllowed =
    (reviewerRole === "agency" && ctx.workspace.id === contract.workspaceId) ||
    (reviewerRole === "creator" && ctx.workspace.id === contract.creator.sourceWorkspaceId);
  if (!isAllowed) return { error: "You can't review this contract from this workspace." };

  const rating = Number(formData.get("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Pick a rating from 1 to 5." };
  }

  const existing = await prisma.review.findUnique({
    where: { contractId_reviewerRole: { contractId, reviewerRole } },
  });
  if (existing) return { error: "This side has already reviewed this contract." };

  await prisma.review.create({
    data: {
      contractId,
      reviewerRole,
      reviewerUserId: user.id,
      rating,
      comment: String(formData.get("comment") ?? "").trim() || null,
    },
  });

  revalidatePath(`/contracts/${contractId}`);
  return { error: undefined };
}

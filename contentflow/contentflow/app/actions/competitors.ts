"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import type { ContentType, SocialPlatform } from "@/lib/generated/prisma/enums";

export async function createCompetitor(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return { error: "Finish onboarding first." };

  const name = String(formData.get("name") ?? "").trim();
  const handle = String(formData.get("handle") ?? "").trim();
  const platform = String(formData.get("platform") ?? "") as SocialPlatform;
  if (!name) return { error: "Name is required." };
  if (!handle) return { error: "Handle is required." };

  const competitor = await prisma.competitor.create({
    data: {
      workspaceId: ctx.workspace.id,
      name,
      handle,
      platform,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidatePath("/competitors");
  return { error: undefined, competitorId: competitor.id };
}

export async function deleteCompetitor(competitorId: string) {
  await requireUser();
  await prisma.competitor.delete({ where: { id: competitorId } });
  revalidatePath("/competitors");
}

export async function addCompetitorSnapshot(
  competitorId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  await requireUser();

  const followersRaw = String(formData.get("followersCount") ?? "").trim();
  const followersCount = Number(followersRaw);
  if (!followersRaw || Number.isNaN(followersCount) || followersCount < 0) {
    return { error: "Enter a valid follower count." };
  }

  const postsRaw = String(formData.get("postsCount") ?? "").trim();
  const postsCount = postsRaw ? Number(postsRaw) : null;
  if (postsRaw && (Number.isNaN(postsCount) || (postsCount ?? 0) < 0)) {
    return { error: "Enter a valid post count." };
  }

  await prisma.competitorSnapshot.create({
    data: { competitorId, followersCount, postsCount },
  });

  revalidatePath(`/competitors/${competitorId}`);
  revalidatePath("/competitors");
  return { error: undefined };
}

export async function deleteCompetitorSnapshot(snapshotId: string, competitorId: string) {
  await requireUser();
  await prisma.competitorSnapshot.delete({ where: { id: snapshotId } });
  revalidatePath(`/competitors/${competitorId}`);
  revalidatePath("/competitors");
}

function parseHashtagList(raw: string): string[] {
  const tags = raw
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, "").trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}

export async function addCompetitorPost(
  competitorId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return { error: "Finish onboarding first." };

  const competitor = await prisma.competitor.findFirst({
    where: { id: competitorId, workspaceId: ctx.workspace.id },
  });
  if (!competitor) return { error: "Competitor not found." };

  const type = String(formData.get("type") ?? "") as ContentType;
  if (!type) return { error: "Pick a format." };

  const hashtags = parseHashtagList(String(formData.get("hashtags") ?? ""));
  const note = String(formData.get("note") ?? "").trim() || null;

  await prisma.competitorPost.create({
    data: { competitorId, type, hashtags, note },
  });

  revalidatePath(`/competitors/${competitorId}`);
  return { error: undefined };
}

export async function deleteCompetitorPost(postId: string, competitorId: string) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return;

  await prisma.competitorPost.deleteMany({
    where: { id: postId, competitor: { workspaceId: ctx.workspace.id } },
  });
  revalidatePath(`/competitors/${competitorId}`);
}

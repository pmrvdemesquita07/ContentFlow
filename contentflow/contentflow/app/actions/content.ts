"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import type { ContentStatus, ContentType, SocialPlatform } from "@/lib/generated/prisma/enums";

const VIEW_PATHS = ["/ideas", "/posts", "/calendar"];

// A weekly repeat that ran forever would let one form submission queue up
// an unbounded number of rows - a year's worth of weekly occurrences is
// more than anyone schedules content that far ahead for, so it doubles as
// a sane ceiling rather than a real limit anyone should hit.
const MAX_REPEAT_OCCURRENCES = 52;

function revalidateViews() {
  VIEW_PATHS.forEach((path) => revalidatePath(path));
}

export async function createContent(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return { error: "Finish onboarding before creating content." };

  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "idea") as ContentStatus;
  const type = String(formData.get("type") ?? "post") as ContentType;
  const body = String(formData.get("body") ?? "");
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");
  const platforms = formData.getAll("platforms").map((p) => String(p)) as SocialPlatform[];
  const repeatWeekly = formData.get("repeatWeekly") === "on";
  const repeatUntilRaw = String(formData.get("repeatUntil") ?? "");

  if (!title) return { error: "Title is required." };

  const baseData = {
    workspaceId: ctx.workspace.id,
    brandId: ctx.brand.id,
    createdBy: user.id,
    title,
    body,
    type,
    status,
    platforms,
  };

  if (repeatWeekly) {
    if (!scheduledAtRaw) return { error: "Pick a date and time to repeat from." };
    const start = new Date(scheduledAtRaw);
    const until = repeatUntilRaw ? new Date(`${repeatUntilRaw}T23:59:59`) : null;
    if (!until || Number.isNaN(until.getTime()) || until < start) {
      return { error: "Pick a valid \"repeat until\" date, on or after the scheduled date." };
    }

    const occurrences: Date[] = [];
    for (
      let current = start;
      current <= until && occurrences.length < MAX_REPEAT_OCCURRENCES;
      current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000)
    ) {
      occurrences.push(current);
    }

    await prisma.content.createMany({
      data: occurrences.map((scheduledAt) => ({ ...baseData, scheduledAt })),
    });
  } else {
    await prisma.content.create({
      data: { ...baseData, scheduledAt: scheduledAtRaw ? new Date(scheduledAtRaw) : null },
    });
  }

  revalidateViews();
  return { error: undefined };
}

export async function updateContentStatus(id: string, status: ContentStatus) {
  await requireUser();
  await prisma.content.update({ where: { id }, data: { status } });
  revalidateViews();
}

export async function updateContent(
  id: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "idea") as ContentStatus;
  const type = String(formData.get("type") ?? "post") as ContentType;
  const body = String(formData.get("body") ?? "");
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");
  const platforms = formData.getAll("platforms").map((p) => String(p)) as SocialPlatform[];

  if (!title) return { error: "Title is required." };

  await prisma.content.update({
    where: { id },
    data: {
      title,
      body,
      type,
      status,
      platforms,
      scheduledAt: scheduledAtRaw ? new Date(scheduledAtRaw) : null,
    },
  });

  revalidateViews();
  return { error: undefined };
}

export async function deleteContent(id: string) {
  await requireUser();
  await prisma.content.delete({ where: { id } });
  revalidateViews();
}

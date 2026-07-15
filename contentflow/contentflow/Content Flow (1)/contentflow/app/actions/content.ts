"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import type { ContentStatus, ContentType, SocialPlatform } from "@/lib/generated/prisma/enums";

const VIEW_PATHS = ["/ideas", "/posts", "/calendar"];

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

  if (!title) return { error: "Title is required." };

  await prisma.content.create({
    data: {
      workspaceId: ctx.workspace.id,
      brandId: ctx.brand.id,
      createdBy: user.id,
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

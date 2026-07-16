"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { prisma } from "@/lib/db";
import type { TaskStatus, TaskPriority } from "@/lib/generated/prisma/enums";

function revalidateTaskViews() {
  ["/ideas", "/posts", "/calendar", "/tasks"].forEach((path) => revalidatePath(path));
}

export async function createTask(
  contentId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  await requireUser();

  const title = String(formData.get("title") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TaskPriority;

  if (!title) return { error: "Title is required." };

  const content = await prisma.content.findUniqueOrThrow({
    where: { id: contentId },
    select: { workspaceId: true, brandId: true },
  });

  await prisma.task.create({
    data: {
      workspaceId: content.workspaceId,
      brandId: content.brandId,
      contentId,
      title,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      priority,
    },
  });

  revalidateTaskViews();
  return { error: undefined };
}

/** A standalone reminder, not attached to any post - created directly from
 * the Tasks board rather than a content item's Tasks tab. */
export async function createStandaloneTask(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return { error: "No brand selected." };

  const title = String(formData.get("title") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TaskPriority;

  if (!title) return { error: "Title is required." };

  await prisma.task.create({
    data: {
      workspaceId: ctx.workspace.id,
      brandId: ctx.brand.id,
      title,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      priority,
    },
  });

  revalidateTaskViews();
  return { error: undefined };
}

/** Toggling back to "todo" is the built-in undo for an accidental check -
 * nothing special-cased, it's just the same status update in reverse. */
export async function updateTaskStatus(id: string, status: TaskStatus) {
  await requireUser();
  await prisma.task.update({ where: { id }, data: { status } });
  revalidateTaskViews();
}

export async function updateTaskPriority(id: string, priority: TaskPriority) {
  await requireUser();
  await prisma.task.update({ where: { id }, data: { priority } });
  revalidateTaskViews();
}

export async function updateTaskDueDate(id: string, dueDate: string) {
  await requireUser();
  await prisma.task.update({
    where: { id },
    data: { dueDate: dueDate ? new Date(dueDate) : null },
  });
  revalidateTaskViews();
}

export async function deleteTask(id: string) {
  await requireUser();
  await prisma.task.delete({ where: { id } });
  revalidateTaskViews();
}

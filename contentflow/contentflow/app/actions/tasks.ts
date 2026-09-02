"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace, planError } from "@/lib/authz";
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
  // Content-attached tasks live in the free Posts view, so this one isn't
  // plan-gated - but the content still has to be the caller's own.
  const ctx = await requireWorkspace();
  if (!ctx) return { error: "No workspace selected." };

  const title = String(formData.get("title") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const priority = (String(formData.get("priority") ?? "medium") || "medium") as TaskPriority;

  if (!title) return { error: "Title is required." };

  const content = await prisma.content.findFirst({
    where: { id: contentId, workspaceId: ctx.workspace.id },
    select: { workspaceId: true, brandId: true },
  });
  if (!content) return { error: "Content not found." };

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
  const ctx = await requireWorkspace("pro");
  if (!ctx) return planError("pro");
  if (!ctx.brand) return { error: "No brand selected." };

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

/* The task mutations below are reachable from a post's Tasks tab on the free
   Posts page, so they scope by workspace but deliberately carry no plan gate -
   only the standalone Tasks board above is a Pro feature. */

/** Toggling back to "todo" is the built-in undo for an accidental check -
 * nothing special-cased, it's just the same status update in reverse. */
export async function updateTaskStatus(id: string, status: TaskStatus) {
  const ctx = await requireWorkspace();
  if (!ctx) return;
  // updateMany rather than update: a row belonging to someone else simply
  // matches nothing, instead of throwing an error the UI would have to handle.
  await prisma.task.updateMany({
    where: { id, workspaceId: ctx.workspace.id },
    data: { status },
  });
  revalidateTaskViews();
}

export async function updateTaskPriority(id: string, priority: TaskPriority) {
  const ctx = await requireWorkspace();
  if (!ctx) return;
  await prisma.task.updateMany({
    where: { id, workspaceId: ctx.workspace.id },
    data: { priority },
  });
  revalidateTaskViews();
}

export async function updateTaskDueDate(id: string, dueDate: string) {
  const ctx = await requireWorkspace();
  if (!ctx) return;
  await prisma.task.updateMany({
    where: { id, workspaceId: ctx.workspace.id },
    data: { dueDate: dueDate ? new Date(dueDate) : null },
  });
  revalidateTaskViews();
}

export async function deleteTask(id: string) {
  const ctx = await requireWorkspace();
  if (!ctx) return;
  await prisma.task.deleteMany({ where: { id, workspaceId: ctx.workspace.id } });
  revalidateTaskViews();
}

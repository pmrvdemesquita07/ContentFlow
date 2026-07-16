"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
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

  await prisma.task.create({
    data: {
      contentId,
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

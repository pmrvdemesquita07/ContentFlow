"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { TaskStatus } from "@/lib/generated/prisma/enums";

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

  if (!title) return { error: "Title is required." };

  await prisma.task.create({
    data: {
      contentId,
      title,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
    },
  });

  revalidateTaskViews();
  return { error: undefined };
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  await requireUser();
  await prisma.task.update({ where: { id }, data: { status } });
  revalidateTaskViews();
}

export async function deleteTask(id: string) {
  await requireUser();
  await prisma.task.delete({ where: { id } });
  revalidateTaskViews();
}

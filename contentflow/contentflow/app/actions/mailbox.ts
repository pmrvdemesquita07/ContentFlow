"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/authz";
import { prisma } from "@/lib/db";
import type { MessageStatus } from "@/lib/generated/prisma/enums";

export async function updateMessageStatus(id: string, status: MessageStatus) {
  const ctx = await requireWorkspace("pro");
  if (!ctx) return;
  await prisma.message.updateMany({
    where: { id, workspaceId: ctx.workspace.id },
    data: { status },
  });
  revalidatePath("/mailbox");
}

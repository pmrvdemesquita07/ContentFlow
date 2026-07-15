"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { MessageStatus } from "@/lib/generated/prisma/enums";

export async function updateMessageStatus(id: string, status: MessageStatus) {
  await requireUser();
  await prisma.message.update({ where: { id }, data: { status } });
  revalidatePath("/mailbox");
}

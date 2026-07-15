"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function disconnectSocialAccount(id: string) {
  await requireUser();
  await prisma.socialAccount.delete({ where: { id } });
  revalidatePath("/social-hub");
}

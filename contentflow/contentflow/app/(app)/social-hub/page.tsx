"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncSocialAccountById } from "@/lib/social-sync";

export async function disconnectSocialAccount(id: string) {
  await requireUser();
  await prisma.socialAccount.delete({ where: { id } });
  revalidatePath("/social-hub");
}

export async function syncSocialAccount(id: string) {
  await requireUser();
  try {
    await syncSocialAccountById(id);
  } catch (error) {
    console.error(`Manual sync failed for social account ${id}:`, error);
    revalidatePath("/social-hub");
    return { error: "sync_failed" as const };
  }
  revalidatePath("/social-hub");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/mailbox");
  return { error: null };
}

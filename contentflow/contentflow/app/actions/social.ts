"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { syncSocialAccountById } from "@/lib/social-sync";

export async function disconnectSocialAccount(id: string) {
  const ctx = await requireWorkspace();
  if (!ctx) return;
  // SocialAccount hangs off a brand, so the brand's workspace is the owner.
  await prisma.socialAccount.deleteMany({
    where: { id, brand: { workspaceId: ctx.workspace.id } },
  });
  revalidatePath("/social-hub");
}

export async function syncSocialAccount(id: string) {
  const ctx = await requireWorkspace();
  if (!ctx) return;
  const owned = await prisma.socialAccount.findFirst({
    where: { id, brand: { workspaceId: ctx.workspace.id } },
    select: { id: true },
  });
  if (!owned) return;
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

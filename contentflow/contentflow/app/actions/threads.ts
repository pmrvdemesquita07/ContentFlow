"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getThreadForMatch } from "@/lib/threads";
import { prisma } from "@/lib/db";

export async function sendThreadMessage(
  matchId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return { error: "Finish onboarding first." };

  const found = await getThreadForMatch(matchId, ctx.workspace.id);
  if (!found?.match.thread) return { error: "This conversation isn't available." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message first." };

  await prisma.threadMessage.create({
    data: { threadId: found.match.thread.id, senderId: user.id, body },
  });

  revalidatePath(`/opportunities/threads/${matchId}`);
  return { error: undefined };
}

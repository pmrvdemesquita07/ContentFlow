"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { replyToInstagramComment } from "@/lib/instagram";

export async function replyToComment(
  commentId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  await requireUser();

  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Write a reply first." };

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { brand: { include: { socialAccounts: true } } },
  });
  if (!comment) return { error: "Comment not found." };

  const account = comment.brand.socialAccounts.find(
    (a) => a.platform === comment.platform && a.status === "connected"
  );
  if (!account?.oauthAccessToken) return { error: "No connected account for this platform." };

  try {
    await replyToInstagramComment(comment.externalId, message, account.oauthAccessToken);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Reply failed." };
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: { status: "replied", replyText: message, repliedAt: new Date() },
  });

  revalidatePath("/social-hub");
  return { error: undefined };
}

export async function markCommentRead(commentId: string) {
  await requireUser();
  await prisma.comment.updateMany({
    where: { id: commentId, status: "unread" },
    data: { status: "read" },
  });
  revalidatePath("/social-hub");
}

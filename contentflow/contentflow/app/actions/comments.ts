"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { replyToInstagramComment } from "@/lib/instagram";

export async function replyToComment(
  commentId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const ctx = await requireWorkspace();
  if (!ctx) return { error: "No workspace selected." };

  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Write a reply first." };

  // Scoped by workspace: this reply is posted with the brand's own OAuth
  // token, so fetching any comment by id would let one workspace publish
  // through another's connected account.
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, workspaceId: ctx.workspace.id },
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

  await prisma.comment.updateMany({
    where: { id: commentId, workspaceId: ctx.workspace.id },
    data: { status: "replied", replyText: message, repliedAt: new Date() },
  });

  revalidatePath("/social-hub");
  return { error: undefined };
}

export async function markCommentRead(commentId: string) {
  const ctx = await requireWorkspace();
  if (!ctx) return;
  await prisma.comment.updateMany({
    where: { id: commentId, status: "unread", workspaceId: ctx.workspace.id },
    data: { status: "read" },
  });
  revalidatePath("/social-hub");
}

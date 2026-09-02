"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { isUrl, fetchLinkPreview } from "@/lib/og-preview";

const VIEW_PATHS = ["/ideas", "/posts", "/calendar"];

function revalidateViews() {
  VIEW_PATHS.forEach((path) => revalidatePath(path));
}

export type CaptureIdeaResult = { error?: string; contentId?: string };

/**
 * The Ideas Bank's single quick-capture input: a bare URL becomes a link
 * idea (title from the page's own Open Graph tags, when it has any),
 * anything else becomes a plain text idea. Image capture is a separate
 * step - it reuses uploadMedia against the contentId this returns, rather
 * than duplicating the upload/storage logic here.
 */
export async function captureIdea(
  _prevState: CaptureIdeaResult | undefined,
  formData: FormData
): Promise<CaptureIdeaResult> {
  const ctx = await requireWorkspace();
  if (!ctx?.brand) return { error: "Finish onboarding first." };

  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "Write or paste something first." };

  let title = text;
  let sourceUrl: string | null = null;
  let preview: Awaited<ReturnType<typeof fetchLinkPreview>> = null;

  if (isUrl(text)) {
    sourceUrl = text;
    preview = await fetchLinkPreview(text);
    title = preview?.title || text;
  }

  const content = await prisma.content.create({
    data: {
      workspaceId: ctx.workspace.id,
      brandId: ctx.brand.id,
      createdBy: ctx.user.id,
      title: title.slice(0, 200),
      type: "post",
      status: "idea",
      platforms: [],
    },
  });

  if (sourceUrl) {
    await prisma.ideaSource.create({
      data: {
        contentId: content.id,
        sourceUrl,
        previewTitle: preview?.title ?? null,
        previewDescription: preview?.description ?? null,
        previewImageUrl: preview?.imageUrl ?? null,
      },
    });
  }

  revalidateViews();
  return { error: undefined, contentId: content.id };
}

export async function toggleIdeaApproved(id: string, approved: boolean) {
  const ctx = await requireWorkspace();
  if (!ctx) return;
  await prisma.content.updateMany({
    where: { id, workspaceId: ctx.workspace.id },
    data: { approved },
  });
  revalidatePath("/ideas");
}

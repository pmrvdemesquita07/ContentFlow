"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "media";
const MAX_SIZE = 25 * 1024 * 1024; // 25MB

function revalidateMediaViews() {
  ["/ideas", "/posts", "/calendar", "/media", "/campaigns"].forEach((path) =>
    revalidatePath(path)
  );
}

function storagePathFromPublicUrl(url: string) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}

export async function uploadMedia(
  contentId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "File is too large (max 25MB)." };
  }

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { workspaceId: true, brandId: true },
  });
  if (!content) return { error: "Content not found." };

  const ext = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const path = `${content.workspaceId}/${contentId}/${randomUUID()}${ext ? `.${ext}` : ""}`;

  const supabase = createAdminClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
  });
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  await prisma.media.create({
    data: {
      workspaceId: content.workspaceId,
      brandId: content.brandId,
      contentId,
      fileUrl: publicUrlData.publicUrl,
      fileName: file.name,
      type: file.type || "application/octet-stream",
    },
  });

  revalidateMediaViews();
  return { error: undefined };
}

/** Briefing docs (PDF/Excel/PowerPoint/etc) attached to a campaign rather
 * than a specific post - same Storage bucket and Media row, just scoped by
 * campaignId instead of contentId. */
export async function uploadCampaignFile(
  campaignId: string,
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "File is too large (max 25MB)." };
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { workspaceId: true, brandId: true },
  });
  if (!campaign) return { error: "Campaign not found." };

  const ext = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const path = `${campaign.workspaceId}/campaigns/${campaignId}/${randomUUID()}${ext ? `.${ext}` : ""}`;

  const supabase = createAdminClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
  });
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  await prisma.media.create({
    data: {
      workspaceId: campaign.workspaceId,
      brandId: campaign.brandId,
      campaignId,
      fileUrl: publicUrlData.publicUrl,
      fileName: file.name,
      type: file.type || "application/octet-stream",
    },
  });

  revalidateMediaViews();
  return { error: undefined };
}

export async function deleteMedia(id: string) {
  await requireUser();

  const media = await prisma.media.delete({ where: { id } });

  const path = storagePathFromPublicUrl(media.fileUrl);
  if (path) {
    const supabase = createAdminClient();
    await supabase.storage.from(BUCKET).remove([path]);
  }

  revalidateMediaViews();
}

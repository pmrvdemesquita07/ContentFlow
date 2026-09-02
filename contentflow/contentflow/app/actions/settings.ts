"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspace } from "@/lib/authz";
import { prisma } from "@/lib/db";

function splitLines(value: string) {
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function splitCommas(value: string) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function updateBrandSettings(
  brandId: string,
  _prevState: { error?: string; saved?: boolean } | undefined,
  formData: FormData
) {
  const ctx = await requireWorkspace();
  if (!ctx) return { error: "No workspace selected." };

  const brandName = String(formData.get("brandName") ?? "").trim();
  const tone = String(formData.get("tone") ?? "").trim();
  const wordsToAvoid = splitCommas(String(formData.get("wordsToAvoid") ?? ""));
  const examplePosts = splitLines(String(formData.get("examplePosts") ?? ""));

  if (!brandName) return { error: "Brand name is required." };

  // Renaming a brand and rewriting its voice both have to be limited to the
  // caller's own workspace - the brandId arrives from the client.
  const owned = await prisma.brand.findFirst({
    where: { id: brandId, workspaceId: ctx.workspace.id },
    select: { id: true },
  });
  if (!owned) return { error: "Brand not found." };

  await prisma.brand.update({ where: { id: brandId }, data: { name: brandName } });

  await prisma.brandVoice.upsert({
    where: { brandId },
    update: { tone, wordsToAvoid, examplePosts },
    create: { brandId, tone, wordsToAvoid, examplePosts },
  });

  revalidatePath("/settings");
  return { saved: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { prisma } from "@/lib/db";

export async function updateDiscoveryProfile(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return { error: "Finish onboarding first." };
  if (ctx.workspace.type !== "creator") {
    return { error: "Only creator workspaces have a discovery profile." };
  }

  await prisma.workspace.update({
    where: { id: ctx.workspace.id },
    data: {
      discoverable: formData.get("discoverable") === "on",
      discoveryNiche: String(formData.get("discoveryNiche") ?? "").trim() || null,
      discoveryBio: String(formData.get("discoveryBio") ?? "").trim() || null,
      discoveryContactEmail: String(formData.get("discoveryContactEmail") ?? "").trim() || null,
    },
  });

  revalidatePath("/settings");
  return { error: undefined };
}

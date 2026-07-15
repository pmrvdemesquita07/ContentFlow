"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function createWorkspaceAndBrand(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();

  const workspaceName = String(formData.get("workspaceName") ?? "").trim();
  const brandName = String(formData.get("brandName") ?? "").trim();

  if (!workspaceName || !brandName) {
    return { error: "Both a workspace name and a brand name are required." };
  }

  // Mirror the Supabase Auth user into our public.users profile row the
  // first time we see them - it may not exist yet if this is their first
  // action after confirming their email.
  await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email ?? "" },
    create: { id: user.id, email: user.email ?? "" },
  });

  await prisma.workspace.create({
    data: {
      name: workspaceName,
      members: { create: { userId: user.id, role: "owner" } },
      brands: { create: { name: brandName } },
    },
  });

  redirect("/dashboard");
}

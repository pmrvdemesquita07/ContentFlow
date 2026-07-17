"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BRAND_COOKIE } from "@/lib/workspace";
import type { WorkspaceType } from "@/lib/generated/prisma/enums";

const ACCOUNT_TYPES: WorkspaceType[] = ["agency", "brand", "creator"];

export async function switchBrand(brandId: string) {
  const user = await requireUser();

  // Only switch if this brand actually belongs to one of the user's workspaces.
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { brands: { some: { id: brandId } } } },
  });
  if (!membership) return;

  const cookieStore = await cookies();
  cookieStore.set(BRAND_COOKIE, brandId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

export async function createBrand(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return { error: "Brand name is required." };

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspaceId },
  });
  if (!membership) return { error: "You don't have access to that workspace." };

  const brand = await prisma.brand.create({ data: { workspaceId, name } });

  const cookieStore = await cookies();
  cookieStore.set(BRAND_COOKIE, brand.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
  return { error: undefined };
}

export async function createWorkspace(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const workspaceName = String(formData.get("workspaceName") ?? "").trim();
  const brandName = String(formData.get("brandName") ?? "").trim();
  const accountTypeRaw = String(formData.get("accountType") ?? "");
  const accountType: WorkspaceType = ACCOUNT_TYPES.includes(accountTypeRaw as WorkspaceType)
    ? (accountTypeRaw as WorkspaceType)
    : "brand";

  if (!workspaceName || !brandName) {
    return { error: "Both a workspace name and a brand name are required." };
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: workspaceName,
      type: accountType,
      members: { create: { userId: user.id, role: "owner" } },
      brands: { create: { name: brandName } },
    },
    include: { brands: true },
  });

  const cookieStore = await cookies();
  cookieStore.set(BRAND_COOKIE, workspace.brands[0].id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
  return { error: undefined };
}

async function requireMembership(userId: string, workspaceId: string) {
  const membership = await prisma.workspaceMember.findFirst({ where: { userId, workspaceId } });
  if (!membership) throw new Error("You don't have access to that workspace.");
}

export async function archiveWorkspace(workspaceId: string) {
  const user = await requireUser();
  await requireMembership(user.id, workspaceId);
  await prisma.workspace.update({ where: { id: workspaceId }, data: { archivedAt: new Date() } });
  revalidatePath("/brands");
  revalidatePath("/", "layout");
}

export async function restoreWorkspace(workspaceId: string) {
  const user = await requireUser();
  await requireMembership(user.id, workspaceId);
  await prisma.workspace.update({ where: { id: workspaceId }, data: { archivedAt: null } });
  revalidatePath("/brands");
  revalidatePath("/", "layout");
}

export async function deleteWorkspace(workspaceId: string) {
  const user = await requireUser();
  await requireMembership(user.id, workspaceId);
  await prisma.workspace.delete({ where: { id: workspaceId } });
  revalidatePath("/brands");
  revalidatePath("/", "layout");
}

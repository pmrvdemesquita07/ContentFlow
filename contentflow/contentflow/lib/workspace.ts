import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const BRAND_COOKIE = "cf_brand_id";

export async function getUserWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId, workspace: { archivedAt: null } },
    orderBy: { createdAt: "asc" },
    include: {
      workspace: {
        include: {
          brands: { orderBy: { createdAt: "asc" }, include: { brandVoice: true } },
        },
      },
    },
  });
  return memberships.map((m) => m.workspace);
}

export async function getArchivedWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId, workspace: { archivedAt: { not: null } } },
    orderBy: { createdAt: "asc" },
    include: { workspace: true },
  });
  return memberships.map((m) => m.workspace);
}

/**
 * Resolves the brand/workspace the user is currently working in. Prefers the
 * brand saved in the switcher cookie (if it still belongs to one of their
 * workspaces), otherwise falls back to their first workspace's first brand.
 */
export async function getCurrentWorkspaceAndBrand(userId: string) {
  const workspaces = await getUserWorkspaces(userId);
  if (workspaces.length === 0) return null;

  const cookieStore = await cookies();
  const preferredBrandId = cookieStore.get(BRAND_COOKIE)?.value;

  if (preferredBrandId) {
    for (const workspace of workspaces) {
      const brand = workspace.brands.find((b) => b.id === preferredBrandId);
      if (brand) return { workspace, brand, workspaces };
    }
  }

  const workspace = workspaces[0];
  const brand = workspace.brands[0] ?? null;
  return { workspace, brand, workspaces };
}

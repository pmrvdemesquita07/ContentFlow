import { prisma } from "@/lib/db";

/**
 * Phase 1/2 scope: one workspace, one brand per user - no switcher yet.
 * Resolves the user's first (and, for now, only) workspace membership and brand.
 */
export async function getCurrentWorkspaceAndBrand(userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      workspace: {
        include: {
          brands: {
            orderBy: { createdAt: "asc" },
            take: 1,
            include: { brandVoice: true },
          },
        },
      },
    },
  });

  if (!membership) return null;

  const brand = membership.workspace.brands[0] ?? null;
  return { workspace: membership.workspace, brand };
}

import { prisma } from "@/lib/db";

/**
 * Everything the Cmd+K search bar can jump to - scoped strictly to the
 * current workspace (brands, campaigns, and creators the user's own
 * organization owns), never across other tenants.
 */
export async function getSearchIndex(workspaceId: string) {
  const [brands, campaigns, creators] = await Promise.all([
    prisma.brand.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.campaign.findMany({
      where: { workspaceId },
      select: { id: true, name: true, brand: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.creator.findMany({
      where: { workspaceId },
      select: { id: true, name: true, instagramHandle: true, tiktokHandle: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    brands: brands.map((b) => ({ id: b.id, label: b.name })),
    campaigns: campaigns.map((c) => ({
      id: c.id,
      label: c.name,
      sublabel: c.brand.name,
    })),
    creators: creators.map((c) => ({
      id: c.id,
      label: c.name,
      sublabel: c.instagramHandle ? `@${c.instagramHandle}` : c.tiktokHandle ? `@${c.tiktokHandle}` : undefined,
    })),
  };
}

import { prisma } from "@/lib/db";

export function getMediaForWorkspace(workspaceId: string) {
  return prisma.media.findMany({
    where: { workspaceId },
    include: { content: { select: { id: true, title: true } } },
    orderBy: { uploadedAt: "desc" },
  });
}

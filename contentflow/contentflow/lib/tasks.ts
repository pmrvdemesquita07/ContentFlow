import { prisma } from "@/lib/db";

export function getTasksForContent(contentId: string) {
  return prisma.task.findMany({
    where: { contentId },
    orderBy: { createdAt: "asc" },
  });
}

/** Scoped to the current brand, not the whole workspace - a workspace with
 * multiple brands shouldn't mix their tasks together. */
export function getTasksForBrand(brandId: string) {
  return prisma.task.findMany({
    where: { content: { brandId } },
    include: { content: { select: { id: true, title: true } } },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });
}

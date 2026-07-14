import { prisma } from "@/lib/db";

export function getTasksForContent(contentId: string) {
  return prisma.task.findMany({
    where: { contentId },
    orderBy: { createdAt: "asc" },
  });
}

export function getTasksForWorkspace(workspaceId: string) {
  return prisma.task.findMany({
    where: { content: { workspaceId } },
    include: { content: { select: { id: true, title: true } } },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
}

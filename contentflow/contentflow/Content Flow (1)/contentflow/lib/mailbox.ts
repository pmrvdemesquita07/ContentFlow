import { prisma } from "@/lib/db";
import type { MessageStatus } from "@/lib/generated/prisma/enums";

export function getMessagesForWorkspace(workspaceId: string, status?: MessageStatus) {
  return prisma.message.findMany({
    where: {
      workspaceId,
      ...(status ? { status } : {}),
    },
    include: { content: { select: { id: true, title: true } } },
    orderBy: { receivedAt: "desc" },
  });
}

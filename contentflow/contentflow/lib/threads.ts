import { prisma } from "@/lib/db";

/**
 * Loads a Match's thread for whichever side is asking - the agency
 * (opportunity.workspaceId) or the creator (creatorWorkspaceId) - and
 * returns null for anyone else, or for a Match that hasn't been accepted
 * yet (no thread exists before that point, by design).
 */
export async function getThreadForMatch(matchId: string, viewerWorkspaceId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      opportunity: { select: { id: true, title: true, workspaceId: true, workspace: { select: { name: true } } } },
      creatorWorkspace: { select: { id: true, name: true } },
      thread: {
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: { sender: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });
  if (!match) return null;

  const isAgencySide = match.opportunity.workspaceId === viewerWorkspaceId;
  const isCreatorSide = match.creatorWorkspaceId === viewerWorkspaceId;
  if (!isAgencySide && !isCreatorSide) return null;

  return { match, isAgencySide };
}

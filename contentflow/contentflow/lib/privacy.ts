import { prisma } from "@/lib/db";

/**
 * GDPR articles 15 and 17: the right to get a copy of your data, and the
 * right to have it erased.
 *
 * Both are harder than they look here because a workspace is shared. Erasing
 * one person must not wipe their colleagues' campaigns, and exporting must
 * not hand someone a copy of a teammate's private data either. The rules
 * below are the ones this app can defend:
 *
 *   - Export covers the workspaces you belong to. You can already read all of
 *     it in the UI, so putting it in a file grants no new access.
 *   - Erasure deletes a workspace outright when you are its last member,
 *     because then it is only your data. When others remain, the workspace
 *     survives and only your membership and personal identifiers go.
 */

/** Everything the app holds for one person, as plain JSON. */
export async function buildDataExport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) return null;

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          brands: {
            include: {
              brandVoice: true,
              socialAccounts: {
                // Access tokens are credentials, not personal data - handing
                // them out in a file would be a security hole, not compliance.
                select: {
                  id: true,
                  platform: true,
                  externalUsername: true,
                  status: true,
                  followersCount: true,
                  followingCount: true,
                  mediaCount: true,
                  connectedAt: true,
                  lastSyncedAt: true,
                },
              },
              content: { include: { metrics: true, media: true, tasks: true, ideaSource: true } },
              campaigns: true,
              comments: true,
              calendarEvents: true,
            },
          },
          creators: true,
          contracts: { include: { payments: true } },
          competitors: true,
          opportunities: true,
          reports: true,
        },
      },
    },
  });

  return {
    exportedAt: new Date().toISOString(),
    format: "ContentFlow data export v1",
    notes:
      "Covers the account and every workspace it belongs to. OAuth tokens are deliberately excluded: they are credentials, not personal data.",
    account: user,
    workspaces: memberships.map((m) => ({
      role: m.role,
      joinedAt: m.createdAt,
      ...m.workspace,
    })),
  };
}

export type DeletionOutcome = {
  workspacesDeleted: string[];
  workspacesLeft: string[];
};

/**
 * Erases the account.
 *
 * `Content.createdBy` and `CalendarEvent.createdBy` are required columns
 * pointing at the user with no cascade, so deleting the user row while those
 * exist fails on a foreign key. In a shared workspace the honest fix is to
 * hand authorship to a remaining member - the team keeps its work, the
 * departing person's identity does not stay attached to it.
 */
export async function eraseAccount(userId: string): Promise<DeletionOutcome> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          members: { select: { userId: true, role: true } },
        },
      },
    },
  });

  const outcome: DeletionOutcome = { workspacesDeleted: [], workspacesLeft: [] };

  for (const membership of memberships) {
    const { workspace } = membership;
    const others = workspace.members.filter((m) => m.userId !== userId);

    if (others.length === 0) {
      // Sole member: the whole workspace is this person's data, and every
      // relation cascades from it.
      await prisma.workspace.delete({ where: { id: workspace.id } });
      outcome.workspacesDeleted.push(workspace.name);
      continue;
    }

    // Prefer an owner to inherit, so authorship lands on someone who can
    // actually administer the workspace.
    const heir = others.find((m) => m.role === "owner") ?? others[0];

    await prisma.$transaction([
      prisma.content.updateMany({
        where: { workspaceId: workspace.id, createdBy: userId },
        data: { createdBy: heir.userId },
      }),
      prisma.calendarEvent.updateMany({
        where: { workspaceId: workspace.id, createdBy: userId },
        data: { createdBy: heir.userId },
      }),
      // Assignee is optional, so an unassigned task is the honest result -
      // reassigning someone else's to-do to a colleague silently would not be.
      prisma.task.updateMany({
        where: { workspaceId: workspace.id, assigneeId: userId },
        data: { assigneeId: null },
      }),
      prisma.workspaceMember.delete({ where: { id: membership.id } }),
    ]);
    outcome.workspacesLeft.push(workspace.name);
  }

  // Thread messages and reviews cascade from the user row itself.
  await prisma.user.delete({ where: { id: userId } });

  return outcome;
}

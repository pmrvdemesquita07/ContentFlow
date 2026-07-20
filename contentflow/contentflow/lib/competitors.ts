import { prisma } from "@/lib/db";

function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

export async function getCompetitorsForWorkspace(workspaceId: string) {
  const competitors = await prisma.competitor.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 2 } },
  });

  return competitors.map((c) => {
    const [latest, previous] = c.snapshots;
    return {
      id: c.id,
      name: c.name,
      platform: c.platform,
      handle: c.handle,
      latest: latest ?? null,
      followerGrowth: latest && previous ? growthPercent(latest.followersCount, previous.followersCount) : null,
    };
  });
}

export async function getCompetitorDetail(competitorId: string, workspaceId: string) {
  const competitor = await prisma.competitor.findFirst({
    where: { id: competitorId, workspaceId },
    include: { snapshots: { orderBy: { capturedAt: "asc" } } },
  });
  if (!competitor) return null;

  const sorted = [...competitor.snapshots].sort(
    (a, b) => b.capturedAt.getTime() - a.capturedAt.getTime()
  );
  const [latest, previous] = sorted;

  return {
    id: competitor.id,
    name: competitor.name,
    platform: competitor.platform,
    handle: competitor.handle,
    notes: competitor.notes,
    snapshots: competitor.snapshots,
    latest: latest ?? null,
    followerGrowth: latest && previous ? growthPercent(latest.followersCount, previous.followersCount) : null,
  };
}

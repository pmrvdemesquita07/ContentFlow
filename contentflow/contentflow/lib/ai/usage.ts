import { prisma } from "@/lib/db";
import type { Plan } from "@/lib/generated/prisma/enums";

/** Generous limits for now - the point is a cost backstop, not a hard product limit. */
const MONTHLY_LIMITS: Record<Plan, number> = {
  starter: 20,
  pro: 100,
  studio: 500,
};

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

export async function checkAiUsage(
  workspaceId: string,
  plan: Plan
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = MONTHLY_LIMITS[plan];
  const usage = await prisma.aiUsage.findUnique({
    where: { workspaceId_month: { workspaceId, month: currentMonth() } },
  });
  const used = usage?.count ?? 0;
  return { allowed: used < limit, used, limit };
}

export async function incrementAiUsage(workspaceId: string): Promise<void> {
  const month = currentMonth();
  await prisma.aiUsage.upsert({
    where: { workspaceId_month: { workspaceId, month } },
    update: { count: { increment: 1 } },
    create: { workspaceId, month, count: 1 },
  });
}

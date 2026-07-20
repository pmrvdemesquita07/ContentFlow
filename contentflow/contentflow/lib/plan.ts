import type { Plan } from "@/lib/generated/prisma/enums";

const PLAN_RANK: Record<Plan, number> = { starter: 0, pro: 1, studio: 2 };

export function planAtLeast(plan: Plan, min: Plan): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[min];
}

export const PLAN_LABELS: Record<Plan, string> = { starter: "Starter", pro: "Pro", studio: "Studio" };

import type { Plan } from "@/lib/generated/prisma/enums";
import { planAtLeast } from "@/lib/plan";

export type TrendsTab = "format" | "hashtag" | "niche";

export function canAccessTrends(plan: Plan, tab: TrendsTab): boolean {
  if (tab === "niche") return planAtLeast(plan, "studio");
  return planAtLeast(plan, "pro");
}

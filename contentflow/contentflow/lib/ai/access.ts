import type { Plan } from "@/lib/generated/prisma/enums";
import { planAtLeast } from "@/lib/plan";

/** Caption suggestions are open to every plan (usage-limited instead); reply and briefing assistants are Studio-only. */
export function canAccessAiReply(plan: Plan): boolean {
  return planAtLeast(plan, "studio");
}

export function canAccessAiBriefing(plan: Plan): boolean {
  return planAtLeast(plan, "studio");
}

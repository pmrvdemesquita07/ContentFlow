import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { planAtLeast } from "@/lib/plan";
import type { Plan } from "@/lib/generated/prisma/enums";

/**
 * The authorization gate for server actions.
 *
 * `requireUser()` on its own only answers "is somebody logged in" - it says
 * nothing about whether the row they just named is theirs. Actions that took
 * an id and mutated it directly were therefore open to any signed-in user of
 * any other workspace. This resolves the caller's *own* workspace so every
 * mutation can be filtered by it, and enforces the plan in the same step -
 * the page-level `redirect()` guards only hide the screen, they can't stop a
 * request that skips the screen entirely.
 *
 * Returns null when the caller has no workspace, or when their plan doesn't
 * reach `minPlan`. Callers that return void treat null as "do nothing";
 * callers that return a form state turn it into a message.
 */
export async function requireWorkspace(minPlan?: Plan) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;
  if (minPlan && !planAtLeast(ctx.workspace.plan, minPlan)) return null;
  return { user, workspace: ctx.workspace, brand: ctx.brand };
}

/** The message shown when an action is called without the plan for it. */
export function planError(minPlan: Plan) {
  return { error: `That feature needs the ${minPlan === "pro" ? "Pro" : "Studio"} plan.` };
}

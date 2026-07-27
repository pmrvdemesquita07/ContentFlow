import { NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api/auth";

/**
 * GET /api/v1/me
 * The authenticated user, every workspace they belong to (each with its
 * brands), and which workspace/brand this request resolved to - a client
 * uses the brand ids here as the `?brandId=` for every other v1 route.
 */
export async function GET(request: Request) {
  const ctx = await requireApiContext(request);
  if ("error" in ctx) return ctx.error;

  return NextResponse.json({
    user: { id: ctx.user.id, email: ctx.user.email },
    currentWorkspace: { id: ctx.workspace.id, name: ctx.workspace.name, plan: ctx.workspace.plan, type: ctx.workspace.type },
    currentBrand: { id: ctx.brand.id, name: ctx.brand.name },
    workspaces: ctx.workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      plan: w.plan,
      type: w.type,
      brands: w.brands.map((b) => ({ id: b.id, name: b.name })),
    })),
  });
}

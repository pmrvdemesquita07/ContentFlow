import { createApiClient } from "@/lib/supabase/api";
import { resolveApiBrand, type ApiBrandContext } from "@/lib/workspace";
import { apiError } from "@/lib/api/respond";

/** Resolves the bearer token from an `Authorization: Bearer <token>` header
 * into the Supabase user it belongs to, or null if missing/invalid. */
export async function authenticateApiRequest(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) return null;

  const supabase = createApiClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

type ApiUser = NonNullable<Awaited<ReturnType<typeof authenticateApiRequest>>>;

type ApiContext = {
  user: ApiUser;
  workspace: ApiBrandContext["workspace"];
  brand: NonNullable<ApiBrandContext["brand"]>;
  workspaces: ApiBrandContext["workspaces"];
};

/**
 * Shared guard for every v1 route: verifies the bearer token, then resolves
 * which brand the request is scoped to (an explicit `?brandId=` if the
 * caller's token has access to it, otherwise their first workspace/brand -
 * there's no cookie to fall back on here like the web app has).
 * Returns `{ error }` (already a Response, ready to `return`) on failure.
 */
export async function requireApiContext(
  request: Request
): Promise<ApiContext | { error: ReturnType<typeof apiError> }> {
  const user = await authenticateApiRequest(request);
  if (!user) return { error: apiError(401, "Invalid or missing access token.") };

  const { searchParams } = new URL(request.url);
  const resolved = await resolveApiBrand(user.id, searchParams.get("brandId"));
  if (!resolved) return { error: apiError(404, "No workspace found for this account.") };
  if (!resolved.brand) return { error: apiError(404, "This workspace has no brand set up yet.") };

  return { user, workspace: resolved.workspace, brand: resolved.brand, workspaces: resolved.workspaces };
}

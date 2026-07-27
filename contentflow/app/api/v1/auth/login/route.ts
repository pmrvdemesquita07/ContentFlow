import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/supabase/api";
import { apiError } from "@/lib/api/respond";

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 * Exchanges credentials for a bearer token (Supabase's own access/refresh
 * token pair) - every other v1 route expects it as `Authorization: Bearer <access_token>`.
 */
export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError(400, "Expected a JSON body with email and password.");
  }

  const { email, password } = body;
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return apiError(400, "email and password are required.");
  }

  const supabase = createApiClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    return apiError(401, "Invalid email or password.");
  }

  return NextResponse.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    token_type: "bearer",
    user: { id: data.user.id, email: data.user.email },
  });
}

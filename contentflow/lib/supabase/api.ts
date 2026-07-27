import { createClient } from "@supabase/supabase-js";

/**
 * Plain, cookie-less client for the JSON API (app/api/v1/*): used to
 * exchange email/password for a JWT on login, and to verify a bearer token
 * on every subsequent request. Separate from the ssr browser/server clients,
 * which are wired to the web app's cookie session instead.
 */
export function createApiClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

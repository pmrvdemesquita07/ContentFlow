import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client - server-only, bypasses RLS. Used for Storage
 * operations so uploads work without hand-authoring storage policies first.
 * Never import this from a Client Component.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDataExport, eraseAccount } from "@/lib/privacy";

/** GDPR art. 15 - returns the caller's data as a JSON string for download. */
export async function exportMyData() {
  const user = await requireUser();
  const data = await buildDataExport(user.id);
  if (!data) return { error: "Account not found." };
  return { json: JSON.stringify(data, null, 2) };
}

/**
 * GDPR art. 17 - erases the account for real.
 *
 * Typing the email is the confirmation step: this destroys workspaces where
 * the caller is the last member, and there is no undo.
 */
export async function deleteMyAccount(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const typed = String(formData.get("confirmEmail") ?? "").trim();

  if (!user.email || typed.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "Type your email exactly as it appears above to confirm." };
  }

  await eraseAccount(user.id);

  // The login itself lives in Supabase Auth, so erasing our rows alone would
  // leave an account that can still sign in - to an empty app.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(`Auth user ${user.id} deleted from app data but not from Supabase:`, error);
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/?deleted=1");
}

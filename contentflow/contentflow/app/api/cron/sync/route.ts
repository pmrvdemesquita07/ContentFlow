import { NextRequest, NextResponse } from "next/server";
import { syncAllConnectedAccounts } from "@/lib/social-sync";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  // Fails closed: with the secret unset the old check was skipped entirely,
  // leaving this endpoint public to anyone who found the URL.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncAllConnectedAccounts();
  return NextResponse.json({ ok: true });
}

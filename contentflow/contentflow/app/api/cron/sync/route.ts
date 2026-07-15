import { NextRequest, NextResponse } from "next/server";
import { syncAllConnectedAccounts } from "@/lib/social-sync";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncAllConnectedAccounts();
  return NextResponse.json({ ok: true });
}

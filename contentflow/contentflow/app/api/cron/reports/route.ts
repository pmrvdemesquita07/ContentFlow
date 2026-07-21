import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendReportEmail } from "@/lib/report-email";

export const maxDuration = 60;

const INTERVAL_DAYS: Record<string, number> = { weekly: 7, monthly: 30 };

function isDue(lastSentAt: Date | null, frequency: string) {
  if (!lastSentAt) return true;
  const intervalMs = INTERVAL_DAYS[frequency] * 24 * 60 * 60 * 1000;
  return Date.now() - lastSentAt.getTime() >= intervalMs;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptions = await prisma.reportSubscription.findMany({
    include: { report: true },
  });

  let sent = 0;
  let failed = 0;
  for (const sub of subscriptions) {
    if (sub.report.revokedAt) continue;
    if (!isDue(sub.lastSentAt, sub.frequency)) continue;

    try {
      const result = await sendReportEmail({ to: sub.recipientEmail, reportId: sub.reportId });
      if (result.error) {
        failed++;
        continue;
      }
      await prisma.reportSubscription.update({
        where: { id: sub.id },
        data: { lastSentAt: new Date() },
      });
      sent++;
    } catch {
      // One subscriber's send failing (bad key, network blip) shouldn't
      // stop the rest of the batch from going out.
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed });
}

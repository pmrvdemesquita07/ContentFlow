"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createReport, revokeReport } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";

type Report = { id: string; createdAt: Date; revokedAt: Date | null };

export function ReportLinks({ campaignId, reports }: { campaignId: string; reports: Report[] }) {
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyLink(reportId: string) {
    const url = `${window.location.origin}/reports/${reportId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(reportId);
    setTimeout(() => setCopiedId((current) => (current === reportId ? null : current)), 2000);
  }

  const active = reports.filter((r) => !r.revokedAt);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        A public link showing this campaign&apos;s real metrics and ROI - no login required.
        Anyone with the link can view it until you revoke it.
      </p>
      {active.length > 0 && (
        <div className="flex flex-col divide-y">
          {active.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="flex flex-col">
                <Link
                  href={`/reports/${r.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  /reports/{r.id.slice(0, 8)}…
                </Link>
                <span className="text-xs text-muted-foreground">
                  Created {r.createdAt.toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => copyLink(r.id)}>
                  {copiedId === r.id ? "Copied!" : "Copy link"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => startTransition(() => revokeReport(r.id, campaignId))}
                >
                  Revoke
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button
        size="sm"
        className="w-fit"
        disabled={isPending}
        onClick={() => startTransition(() => createReport(campaignId))}
      >
        {isPending ? "Generating…" : "Generate report link"}
      </Button>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { updateOpportunityStatus } from "@/app/actions/opportunities";
import type { OpportunityStatus } from "@/lib/generated/prisma/enums";

const STATUSES: OpportunityStatus[] = ["open", "closed"];

export function StatusSelect({
  opportunityId,
  status,
}: {
  opportunityId: string;
  status: OpportunityStatus;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() => updateOpportunityStatus(opportunityId, e.target.value as OpportunityStatus))
      }
      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm capitalize shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}

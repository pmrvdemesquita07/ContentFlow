"use client";

import { useTransition } from "react";
import { updateMatchStatus } from "@/app/actions/opportunities";
import type { MatchStatus } from "@/lib/generated/prisma/enums";

const STATUSES: MatchStatus[] = ["applied", "invited", "accepted", "rejected", "withdrawn"];

export function MatchStatusSelect({
  matchId,
  opportunityId,
  status,
}: {
  matchId: string;
  opportunityId: string;
  status: MatchStatus;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() =>
          updateMatchStatus(matchId, opportunityId, e.target.value as MatchStatus)
        )
      }
      className="h-8 rounded-md border border-input bg-transparent px-2 text-xs capitalize shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}

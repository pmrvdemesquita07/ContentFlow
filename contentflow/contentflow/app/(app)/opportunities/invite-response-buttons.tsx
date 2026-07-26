"use client";

import { useState, useTransition } from "react";
import { updateMatchStatus } from "@/app/actions/opportunities";
import { Button } from "@/components/ui/button";

export function InviteResponseButtons({
  matchId,
  opportunityId,
}: {
  matchId: string;
  opportunityId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function respond(status: "accepted" | "rejected") {
    startTransition(async () => {
      const result = await updateMatchStatus(matchId, opportunityId, status);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={isPending} onClick={() => respond("accepted")}>
          Accept
        </Button>
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => respond("rejected")}>
          Decline
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

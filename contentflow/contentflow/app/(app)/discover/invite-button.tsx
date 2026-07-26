"use client";

import { useState, useTransition } from "react";
import { inviteCreatorToOpportunity } from "@/app/actions/opportunities";
import { Button } from "@/components/ui/button";

type OpportunityOption = { id: string; title: string };

export function InviteButton({
  creatorWorkspaceId,
  opportunities,
}: {
  creatorWorkspaceId: string;
  opportunities: OpportunityOption[];
}) {
  const [open, setOpen] = useState(false);
  const [opportunityId, setOpportunityId] = useState(opportunities[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (opportunities.length === 0) return null;

  if (sent) {
    return <p className="mt-2 text-xs text-success">Invite sent.</p>;
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="mt-2 w-fit" onClick={() => setOpen(true)}>
        Invite to opportunity
      </Button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <select
        value={opportunityId}
        onChange={(e) => setOpportunityId(e.target.value)}
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {opportunities.map((o) => (
          <option key={o.id} value={o.id}>
            {o.title}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await inviteCreatorToOpportunity(opportunityId, creatorWorkspaceId);
              if (result?.error) setError(result.error);
              else setSent(true);
            })
          }
        >
          {isPending ? "Sending…" : "Send invite"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

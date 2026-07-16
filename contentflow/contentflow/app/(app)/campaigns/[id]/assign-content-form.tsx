"use client";

import { useState, useTransition } from "react";
import { assignContentToCampaign } from "@/app/actions/campaigns";
import { Button } from "@/components/ui/button";

type UnassignedContent = { id: string; title: string; type: string; status: string };

export function AssignContentForm({
  campaignId,
  unassigned,
}: {
  campaignId: string;
  unassigned: UnassignedContent[];
}) {
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();

  if (unassigned.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No unassigned posts available - everything is already in a campaign.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <option value="">Select a post...</option>
        {unassigned.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title} ({c.status})
          </option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={!selected || isPending}
        onClick={() =>
          startTransition(async () => {
            await assignContentToCampaign(selected, campaignId);
            setSelected("");
          })
        }
      >
        {isPending ? "Adding..." : "Add"}
      </Button>
    </div>
  );
}

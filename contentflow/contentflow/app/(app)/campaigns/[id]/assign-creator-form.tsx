"use client";

import { useState, useTransition } from "react";
import { addCreatorToCampaign } from "@/app/actions/creators";
import { Button } from "@/components/ui/button";

type UnassignedCreator = { id: string; name: string; instagramHandle: string | null };

export function AssignCreatorForm({
  campaignId,
  unassigned,
}: {
  campaignId: string;
  unassigned: UnassignedCreator[];
}) {
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();

  if (unassigned.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No other creators to add - everyone in your roster is already on this campaign.
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
        <option value="">Select a creator...</option>
        {unassigned.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.instagramHandle ? ` (@${c.instagramHandle})` : ""}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={!selected || isPending}
        onClick={() =>
          startTransition(async () => {
            await addCreatorToCampaign(selected, campaignId);
            setSelected("");
          })
        }
      >
        {isPending ? "Adding..." : "Add"}
      </Button>
    </div>
  );
}

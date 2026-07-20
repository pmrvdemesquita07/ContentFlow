"use client";

import { useActionState } from "react";
import { updateCampaign } from "@/app/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function toDateInputValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function EditCampaignForm({
  campaignId,
  name,
  description,
  startDate,
  endDate,
  budget,
}: {
  campaignId: string;
  name: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateCampaign.bind(null, campaignId),
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-name">Name</Label>
        <Input id="edit-name" name="name" defaultValue={name} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-description">Description</Label>
        <Textarea id="edit-description" name="description" defaultValue={description} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-startDate">Start date</Label>
          <Input
            id="edit-startDate"
            name="startDate"
            type="date"
            defaultValue={toDateInputValue(startDate)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-endDate">End date</Label>
          <Input
            id="edit-endDate"
            name="endDate"
            type="date"
            defaultValue={toDateInputValue(endDate)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-budget">Budget (optional)</Label>
        <Input
          id="edit-budget"
          name="budget"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 1000.00"
          defaultValue={budget ?? ""}
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

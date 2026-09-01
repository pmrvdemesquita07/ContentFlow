"use client";

import { useRef, useState, useTransition } from "react";
import { createContract } from "@/app/actions/contracts";
import { PricingAssistant } from "@/components/contracts/pricing-assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = { id: string; name: string };

export function NewContractForm({
  creators,
  campaigns,
  defaultCreatorId,
  defaultTitle,
}: {
  creators: Option[];
  campaigns: Option[];
  defaultCreatorId?: string;
  defaultTitle?: string;
}) {
  const [state, setState] = useState<{ error?: string } | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [creatorId, setCreatorId] = useState(defaultCreatorId ?? "");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createContract(undefined, formData);
      setState(result);
      if (!result?.error) {
        formRef.current?.reset();
        setCreatorId("");
      }
    });
  }

  if (creators.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a creator first from{" "}
        <a href="/creators" className="underline">
          Creators
        </a>
        , then come back to create a contract with them.
      </p>
    );
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="creatorId">Creator</Label>
          <select
            id="creatorId"
            name="creatorId"
            required
            value={creatorId}
            onChange={(e) => setCreatorId(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Select a creator...</option>
            {creators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="campaignId">Campaign (optional)</Label>
          <select
            id="campaignId"
            name="campaignId"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">No specific campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {creatorId && (
        <PricingAssistant
          creatorId={creatorId}
          onUseAmount={(amount) => {
            if (amountRef.current) amountRef.current.value = String(amount);
          }}
        />
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g. Summer Launch - 3 Reels"
          defaultValue={defaultTitle}
          required
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="500.00"
            required
            ref={amountRef}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" placeholder="Deliverables, usage rights, etc." />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Creating…" : "Create contract"}
      </Button>
    </form>
  );
}

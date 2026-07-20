"use client";

import { useActionState, useEffect, useRef } from "react";
import { createOpportunity } from "@/app/actions/opportunities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PLATFORMS = [
  { value: "", label: "Any platform" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
];

export function NewOpportunityForm() {
  const [state, formAction, pending] = useActionState(createOpportunity, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="e.g. Summer collection - 2 Reels" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" placeholder="What you're looking for" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="niche">Niche</Label>
          <Input id="niche" name="niche" placeholder="e.g. Fitness" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="platform">Platform</Label>
          <select
            id="platform"
            name="platform"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="budget">Budget (optional)</Label>
          <Input id="budget" name="budget" type="number" step="0.01" min="0" placeholder="e.g. 500.00" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="deadline">Deadline (optional)</Label>
          <Input id="deadline" name="deadline" type="date" />
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Posting…" : "Post opportunity"}
      </Button>
    </form>
  );
}

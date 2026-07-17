"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCreator } from "@/app/actions/creators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewCreatorForm() {
  const [state, formAction, pending] = useActionState(createCreator, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="e.g. Jane Doe" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contactEmail">Email</Label>
          <Input id="contactEmail" name="contactEmail" type="email" placeholder="jane@example.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contactPhone">Phone</Label>
          <Input id="contactPhone" name="contactPhone" placeholder="+1 555 0100" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="instagramHandle">Instagram handle</Label>
          <Input id="instagramHandle" name="instagramHandle" placeholder="janedoe" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tiktokHandle">TikTok handle</Label>
          <Input id="tiktokHandle" name="tiktokHandle" placeholder="janedoe" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" placeholder="Rate, niche, past collaborations…" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Adding…" : "Add creator"}
      </Button>
    </form>
  );
}

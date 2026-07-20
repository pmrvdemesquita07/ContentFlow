"use client";

import { useActionState, useEffect, useRef } from "react";
import { addCompetitorSnapshot } from "@/app/actions/competitors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddSnapshotForm({ competitorId }: { competitorId: string }) {
  const action = addCompetitorSnapshot.bind(null, competitorId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="followersCount">Followers</Label>
        <Input
          id="followersCount"
          name="followersCount"
          type="number"
          min="0"
          placeholder="12000"
          required
          className="w-36"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="postsCount">Posts (optional)</Label>
        <Input id="postsCount" name="postsCount" type="number" min="0" placeholder="240" className="w-32" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add check-in"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

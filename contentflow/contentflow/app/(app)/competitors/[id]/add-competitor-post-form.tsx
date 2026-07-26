"use client";

import { useActionState, useEffect, useRef } from "react";
import { addCompetitorPost } from "@/app/actions/competitors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContentType } from "@/lib/generated/prisma/enums";

const TYPES: ContentType[] = ["post", "story", "reel", "video", "carousel"];

export function AddCompetitorPostForm({ competitorId }: { competitorId: string }) {
  const action = addCompetitorPost.bind(null, competitorId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="type">Format</Label>
        <select
          id="type"
          name="type"
          required
          defaultValue=""
          className="h-9 w-32 rounded-md border border-input bg-transparent px-2 text-sm capitalize shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="" disabled>
            Select...
          </option>
          {TYPES.map((t) => (
            <option key={t} value={t} className="capitalize">
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hashtags">Hashtags</Label>
        <Input id="hashtags" name="hashtags" placeholder="coldbrew summer" className="w-44" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" name="note" placeholder="Dance trend, high engagement" className="w-56" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Log post"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

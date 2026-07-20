"use client";

import { useActionState, useState } from "react";
import { applyToOpportunity } from "@/app/actions/opportunities";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ApplyForm({ opportunityId }: { opportunityId: string }) {
  const action = applyToOpportunity.bind(null, opportunityId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);

  // No need to close this back to a button on success - a successful
  // application changes the parent page's server data (hasApplied), which
  // revalidatePath refreshes, swapping this whole component out for a
  // status badge on the next render.
  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Apply
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-2">
      <Textarea name="message" placeholder="A short pitch (optional)" rows={2} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Applying…" : "Send application"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

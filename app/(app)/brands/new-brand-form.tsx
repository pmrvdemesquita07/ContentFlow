"use client";

import { useActionState } from "react";
import { createBrand } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewBrandForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction, pending] = useActionState(createBrand, undefined);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <Input name="name" placeholder="New brand name" required className="h-8 max-w-56" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Adding…" : "Add brand"}
      </Button>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}

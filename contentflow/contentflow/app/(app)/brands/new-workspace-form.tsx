"use client";

import { useActionState } from "react";
import { createWorkspace } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ACCOUNT_TYPES = [
  { value: "agency", label: "Agency" },
  { value: "brand", label: "Brand" },
  { value: "creator", label: "Creator" },
] as const;

export function NewWorkspaceForm() {
  const [state, formAction, pending] = useActionState(createWorkspace, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>Account type</Label>
        <div className="grid grid-cols-3 gap-2">
          {ACCOUNT_TYPES.map((type, i) => (
            <label
              key={type.value}
              className="flex cursor-pointer items-center justify-center rounded-md border p-2 text-xs font-medium has-[:checked]:border-primary has-[:checked]:bg-accent"
            >
              <input
                type="radio"
                name="accountType"
                value={type.value}
                defaultChecked={i === 1}
                className="sr-only"
              />
              {type.label}
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="workspaceName">Workspace name</Label>
        <Input id="workspaceName" name="workspaceName" placeholder="e.g. New Agency Client" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="brandName">First brand</Label>
        <Input id="brandName" name="brandName" placeholder="e.g. Their Brand Name" required />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Creating…" : "Create workspace"}
      </Button>
    </form>
  );
}

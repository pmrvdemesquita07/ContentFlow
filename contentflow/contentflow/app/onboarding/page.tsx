"use client";

import { useActionState } from "react";
import { createWorkspaceAndBrand } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ACCOUNT_TYPES = [
  {
    value: "agency",
    label: "Agency",
    description: "Manage multiple client brands from one place.",
  },
  {
    value: "brand",
    label: "Brand",
    description: "Run content for your own brand.",
  },
  {
    value: "creator",
    label: "Content creator",
    description: "Plan and publish your own content.",
  },
] as const;

export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState(createWorkspaceAndBrand, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Set up your workspace</CardTitle>
          <CardDescription>
            A workspace holds everything for your team. Give it a name, then name the first
            brand you&apos;ll be creating content for.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Account type</Label>
              <div className="grid grid-cols-3 gap-2">
                {ACCOUNT_TYPES.map((type, i) => (
                  <label
                    key={type.value}
                    className="flex cursor-pointer flex-col gap-0.5 rounded-md border p-2.5 text-center has-[:checked]:border-primary has-[:checked]:bg-accent"
                  >
                    <input
                      type="radio"
                      name="accountType"
                      value={type.value}
                      defaultChecked={i === 1}
                      className="sr-only"
                    />
                    <span className="text-xs font-medium">{type.label}</span>
                    <span className="text-[10px] text-muted-foreground">{type.description}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="workspaceName">Workspace name</Label>
              <Input
                id="workspaceName"
                name="workspaceName"
                placeholder="e.g. Acme Studio"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brandName">First brand</Label>
              <Input id="brandName" name="brandName" placeholder="e.g. Acme Coffee Co." required />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Setting up…" : "Continue"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

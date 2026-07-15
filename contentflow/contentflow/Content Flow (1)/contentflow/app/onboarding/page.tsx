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

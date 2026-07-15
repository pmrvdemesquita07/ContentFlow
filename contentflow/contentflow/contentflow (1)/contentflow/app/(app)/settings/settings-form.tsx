"use client";

import { useActionState } from "react";
import { updateBrandSettings } from "@/app/actions/settings";
import type { BrandWithVoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SettingsForm({ brand }: { brand: BrandWithVoice }) {
  const updateForBrand = updateBrandSettings.bind(null, brand.id);
  const [state, formAction, pending] = useActionState(updateForBrand, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="brandName">Name</Label>
            <Input id="brandName" name="brandName" defaultValue={brand.name} required />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand Voice</CardTitle>
          <CardDescription>
            Every AI Assistant reads this before drafting anything for this brand.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tone">Tone of voice</Label>
            <Textarea
              id="tone"
              name="tone"
              rows={3}
              defaultValue={brand.brandVoice?.tone ?? ""}
              placeholder="e.g. Warm, direct, a little playful. Short sentences over long ones."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wordsToAvoid">Words to avoid</Label>
            <Input
              id="wordsToAvoid"
              name="wordsToAvoid"
              defaultValue={brand.brandVoice?.wordsToAvoid.join(", ") ?? ""}
              placeholder="e.g. synergy, disrupt, revolutionary"
            />
            <p className="text-xs text-muted-foreground">Separate with commas.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="examplePosts">Example posts that worked well</Label>
            <Textarea
              id="examplePosts"
              name="examplePosts"
              rows={5}
              defaultValue={brand.brandVoice?.examplePosts.join("\n") ?? ""}
              placeholder="One example per line."
            />
            <p className="text-xs text-muted-foreground">One example per line.</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          {state?.saved && <p className="text-sm text-success">Saved.</p>}
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </CardFooter>
      </Card>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Sparkles } from "lucide-react";
import { suggestBriefingDraft } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BriefingAssistant({ onUse }: { onUse: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(suggestBriefingDraft, undefined);

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="w-fit">
        <Sparkles className="size-3.5" />
        Help me write this
      </Button>
      {open && (
        <div className="flex flex-col gap-3 rounded-md border p-3">
          <form action={formAction} className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai-objective">Objective</Label>
                <Input
                  id="ai-objective"
                  name="objective"
                  placeholder="e.g. drive awareness for new product"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai-tone">Desired tone</Label>
                <Input id="ai-tone" name="tone" placeholder="e.g. friendly and casual" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai-budget">Approximate budget</Label>
                <Input id="ai-budget" name="budget" placeholder="e.g. around 500 EUR" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai-deadline">Deadline</Label>
                <Input id="ai-deadline" name="deadline" placeholder="e.g. end of next month" />
              </div>
            </div>
            <Button type="submit" size="sm" disabled={pending} className="w-fit">
              {pending ? "Writing…" : "Generate draft"}
            </Button>
          </form>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.draft && (
            <div className="flex flex-col gap-2">
              <p className="text-sm">{state.draft}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-fit"
                onClick={() => {
                  onUse(state.draft!);
                  setOpen(false);
                }}
              >
                Use this draft
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Sparkles } from "lucide-react";
import { suggestCaptions } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CaptionAssistant({
  contentType,
  onUse,
}: {
  contentType: string;
  onUse: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(suggestCaptions, undefined);

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="w-fit">
        <Sparkles className="size-3.5" />
        Suggest captions
      </Button>
      {open && (
        <div className="flex flex-col gap-3 rounded-md border p-3">
          <form action={formAction} className="flex flex-col gap-2">
            <input type="hidden" name="contentType" value={contentType} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-topic">Topic</Label>
              <Input id="ai-topic" name="topic" placeholder="e.g. new seasonal blend launch" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-hashtags">Hashtags already chosen (optional)</Label>
              <Input id="ai-hashtags" name="hashtags" placeholder="#coldbrew #summer" />
            </div>
            <Button type="submit" size="sm" disabled={pending} className="w-fit">
              {pending ? "Thinking…" : "Generate 3 suggestions"}
            </Button>
          </form>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.suggestions && state.suggestions.length > 0 && (
            <div className="flex flex-col divide-y">
              {state.suggestions.map((s, i) => (
                <div key={i} className="flex items-start justify-between gap-2 py-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                    <p className="text-sm">{s.text}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onUse(s.text);
                      setOpen(false);
                    }}
                  >
                    Use
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { suggestMediaKitPitch } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function PitchAssistant() {
  const [pending, startTransition] = useTransition();
  const [pitch, setPitch] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    setError(undefined);
    setCopied(false);
    startTransition(async () => {
      const result = await suggestMediaKitPitch();
      if (result.error) {
        setError(result.error);
        return;
      }
      setPitch(result.pitch);
    });
  }

  return (
    <Card className="print-hide">
      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" />
            AI pitch text
          </div>
          <Button type="button" size="sm" variant="outline" onClick={handleGenerate} disabled={pending}>
            {pending ? "Writing…" : pitch ? "Regenerate" : "Generate"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          A short pitch built from your real numbers above - copy it into a proposal, email, or
          your Discover bio. It isn&apos;t added to the printed kit automatically.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {pitch && (
          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
            <p className="text-sm">{pitch}</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-fit"
              onClick={async () => {
                await navigator.clipboard.writeText(pitch);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

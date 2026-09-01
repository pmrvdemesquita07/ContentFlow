"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { suggestPricingSuggestion, type PricingSuggestion } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";

export function PricingAssistant({
  creatorId,
  onUseAmount,
}: {
  creatorId: string;
  onUseAmount: (amount: number) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<PricingSuggestion | undefined>();
  const [error, setError] = useState<string | undefined>();

  function handleSuggest() {
    setError(undefined);
    setSuggestion(undefined);
    startTransition(async () => {
      const result = await suggestPricingSuggestion(creatorId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuggestion(result.suggestion);
    });
  }

  if (!creatorId) return null;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
      <Button type="button" size="sm" variant="outline" onClick={handleSuggest} disabled={pending} className="w-fit">
        <Sparkles className="size-3.5" />
        {pending ? "Thinking…" : "Suggest a price"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {suggestion && (
        <div className="flex flex-col gap-1.5 text-sm">
          <p className="font-medium">
            {suggestion.min.toLocaleString()} – {suggestion.max.toLocaleString()} {suggestion.currency}
          </p>
          <p className="text-xs text-muted-foreground">{suggestion.reasoning}</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="w-fit"
            onClick={() => onUseAmount(Math.round((suggestion.min + suggestion.max) / 2))}
          >
            Use this amount
          </Button>
        </div>
      )}
    </div>
  );
}

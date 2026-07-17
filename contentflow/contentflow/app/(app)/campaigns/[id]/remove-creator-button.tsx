"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { removeCreatorFromCampaign } from "@/app/actions/creators";
import { Button } from "@/components/ui/button";

export function RemoveCreatorButton({
  creatorId,
  campaignId,
}: {
  creatorId: string;
  campaignId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => removeCreatorFromCampaign(creatorId, campaignId))}
    >
      <X className="size-4" />
    </Button>
  );
}

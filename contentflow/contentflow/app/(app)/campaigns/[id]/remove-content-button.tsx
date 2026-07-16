"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { removeContentFromCampaign } from "@/app/actions/campaigns";
import { Button } from "@/components/ui/button";

export function RemoveContentButton({
  contentId,
  campaignId,
}: {
  contentId: string;
  campaignId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => removeContentFromCampaign(contentId, campaignId))}
    >
      <X className="size-4" />
    </Button>
  );
}

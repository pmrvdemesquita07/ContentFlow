"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCampaign } from "@/app/actions/campaigns";
import { Button } from "@/components/ui/button";

export function DeleteCampaignButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Delete this campaign? Posts stay - they just won't be grouped anymore.")) return;
    startTransition(async () => {
      await deleteCampaign(campaignId);
      router.push("/campaigns");
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      <Trash2 className="size-4" />
      {isPending ? "Deleting..." : "Delete campaign"}
    </Button>
  );
}

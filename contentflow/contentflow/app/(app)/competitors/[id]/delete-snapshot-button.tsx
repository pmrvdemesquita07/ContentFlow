"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { deleteCompetitorSnapshot } from "@/app/actions/competitors";
import { Button } from "@/components/ui/button";

export function DeleteSnapshotButton({
  snapshotId,
  competitorId,
}: {
  snapshotId: string;
  competitorId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => deleteCompetitorSnapshot(snapshotId, competitorId))}
    >
      <X className="size-4" />
    </Button>
  );
}

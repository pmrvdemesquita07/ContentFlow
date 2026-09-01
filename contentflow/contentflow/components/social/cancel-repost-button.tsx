"use client";

import { useTransition } from "react";
import { updateContentStatus } from "@/app/actions/content";
import { Button } from "@/components/ui/button";

export function CancelRepostButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await updateContentStatus(id, "draft");
        });
      }}
    >
      {isPending ? "Cancelling..." : "Cancel"}
    </Button>
  );
}

"use client";

import { useTransition } from "react";
import { deleteCreator } from "@/app/actions/creators";
import { Button } from "@/components/ui/button";

export function DeleteCreatorButton({ creatorId }: { creatorId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() => {
        if (confirm("Remove this creator?")) startTransition(() => deleteCreator(creatorId));
      }}
    >
      {isPending ? "Removing…" : "Remove"}
    </Button>
  );
}

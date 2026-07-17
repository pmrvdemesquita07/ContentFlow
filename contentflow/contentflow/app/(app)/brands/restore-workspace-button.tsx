"use client";

import { useTransition } from "react";
import { restoreWorkspace } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";

export function RestoreWorkspaceButton({ workspaceId }: { workspaceId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(() => restoreWorkspace(workspaceId))}
    >
      {isPending ? "Restoring…" : "Restore"}
    </Button>
  );
}

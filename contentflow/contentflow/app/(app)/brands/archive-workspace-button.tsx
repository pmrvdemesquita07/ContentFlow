"use client";

import { useTransition } from "react";
import { archiveWorkspace } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";

export function ArchiveWorkspaceButton({ workspaceId }: { workspaceId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => {
        if (confirm("Archive this workspace? You can restore it later from the archived list."))
          startTransition(() => archiveWorkspace(workspaceId));
      }}
    >
      {isPending ? "Archiving…" : "Archive"}
    </Button>
  );
}

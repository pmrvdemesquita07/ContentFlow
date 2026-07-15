"use client";

import { useState, useTransition } from "react";
import { syncSocialAccount } from "@/app/actions/social";
import { Button } from "@/components/ui/button";

export function SyncButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          setError(false);
          startTransition(async () => {
            const result = await syncSocialAccount(id);
            if (result?.error) setError(true);
          });
        }}
      >
        {isPending ? "Syncing..." : "Sync now"}
      </Button>
      {error && <p className="text-xs text-destructive">Sync failed. Try again later.</p>}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { withdrawApplication } from "@/app/actions/opportunities";
import { Button } from "@/components/ui/button";

export function WithdrawButton({ matchId }: { matchId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => withdrawApplication(matchId))}
    >
      {isPending ? "Withdrawing…" : "Withdraw"}
    </Button>
  );
}

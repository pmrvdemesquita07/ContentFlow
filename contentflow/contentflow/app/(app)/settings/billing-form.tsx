"use client";

import { useState, useTransition } from "react";
import { createCheckoutSession, createPortalSession } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import type { PaidPlan } from "@/lib/stripe";

export function UpgradeButton({ plan, label }: { plan: PaidPlan; label: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function upgrade() {
    startTransition(async () => {
      const result = await createCheckoutSession(plan);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" disabled={isPending} onClick={upgrade}>
        {isPending ? "A abrir checkout…" : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function ManageBillingButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function manage() {
    startTransition(async () => {
      const result = await createPortalSession();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" variant="outline" disabled={isPending} onClick={manage}>
        {isPending ? "A abrir…" : "Gerir faturação"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

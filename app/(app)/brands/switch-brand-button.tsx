"use client";

import { useTransition } from "react";
import { switchBrand } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function SwitchBrandButton({ brandId, isCurrent }: { brandId: string; isCurrent: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (isCurrent) return <Badge variant="success">Current</Badge>;

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(() => switchBrand(brandId))}
    >
      {isPending ? "Switching…" : "Switch to this brand"}
    </Button>
  );
}

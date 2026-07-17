"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchBrand } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function SwitchBrandLink({ brandId, isCurrent }: { brandId: string; isCurrent: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (isCurrent) return <Badge variant="success">Viewing</Badge>;

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await switchBrand(brandId);
          router.push("/dashboard");
        })
      }
    >
      {isPending ? "Switching…" : "Open"}
    </Button>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteOpportunity } from "@/app/actions/opportunities";
import { Button } from "@/components/ui/button";

export function DeleteOpportunityButton({ opportunityId }: { opportunityId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Delete this opportunity? Applications will be deleted too.")) return;
    startTransition(async () => {
      await deleteOpportunity(opportunityId);
      router.push("/opportunities");
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      <Trash2 className="size-4" />
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}

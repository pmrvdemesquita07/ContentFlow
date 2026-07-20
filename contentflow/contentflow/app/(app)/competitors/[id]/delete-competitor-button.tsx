"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCompetitor } from "@/app/actions/competitors";
import { Button } from "@/components/ui/button";

export function DeleteCompetitorButton({ competitorId }: { competitorId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Stop tracking this competitor? Its check-ins will be deleted too.")) return;
    startTransition(async () => {
      await deleteCompetitor(competitorId);
      router.push("/competitors");
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      <Trash2 className="size-4" />
      {isPending ? "Deleting..." : "Delete competitor"}
    </Button>
  );
}

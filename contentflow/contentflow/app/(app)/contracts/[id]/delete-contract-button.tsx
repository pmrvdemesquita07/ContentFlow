"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteContract } from "@/app/actions/contracts";
import { Button } from "@/components/ui/button";

export function DeleteContractButton({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Delete this contract? Its payments will be deleted too.")) return;
    startTransition(async () => {
      await deleteContract(contractId);
      router.push("/contracts");
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      <Trash2 className="size-4" />
      {isPending ? "Deleting..." : "Delete contract"}
    </Button>
  );
}

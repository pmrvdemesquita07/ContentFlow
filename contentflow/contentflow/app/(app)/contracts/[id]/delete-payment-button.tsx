"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { deletePayment } from "@/app/actions/contracts";
import { Button } from "@/components/ui/button";

export function DeletePaymentButton({
  paymentId,
  contractId,
}: {
  paymentId: string;
  contractId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => deletePayment(paymentId, contractId))}
    >
      <X className="size-4" />
    </Button>
  );
}

"use client";

import { useTransition } from "react";
import { updatePaymentStatus } from "@/app/actions/contracts";
import type { PaymentStatus } from "@/lib/generated/prisma/enums";

const STATUSES: PaymentStatus[] = ["pending", "paid", "overdue", "cancelled"];

export function PaymentStatusSelect({
  paymentId,
  contractId,
  status,
}: {
  paymentId: string;
  contractId: string;
  status: PaymentStatus;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() =>
          updatePaymentStatus(paymentId, contractId, e.target.value as PaymentStatus)
        )
      }
      className="h-8 rounded-md border border-input bg-transparent px-2 text-xs capitalize shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}

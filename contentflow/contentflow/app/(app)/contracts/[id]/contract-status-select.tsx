"use client";

import { useTransition } from "react";
import { updateContractStatus } from "@/app/actions/contracts";
import type { ContractStatus } from "@/lib/generated/prisma/enums";

const STATUSES: ContractStatus[] = ["draft", "sent", "signed", "completed", "cancelled"];

export function ContractStatusSelect({
  contractId,
  status,
}: {
  contractId: string;
  status: ContractStatus;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() => updateContractStatus(contractId, e.target.value as ContractStatus))
      }
      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm capitalize shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}

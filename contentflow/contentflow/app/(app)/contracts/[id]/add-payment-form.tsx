"use client";

import { useActionState, useEffect, useRef } from "react";
import { addPayment } from "@/app/actions/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddPaymentForm({ contractId }: { contractId: string }) {
  const action = addPayment.bind(null, contractId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="paymentAmount">Amount</Label>
        <Input
          id="paymentAmount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="150.00"
          required
          className="w-32"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="paymentDueDate">Due date</Label>
        <Input id="paymentDueDate" name="dueDate" type="date" className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="paymentNotes">Notes</Label>
        <Input id="paymentNotes" name="notes" placeholder="Deposit, final, etc." className="w-48" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add payment"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

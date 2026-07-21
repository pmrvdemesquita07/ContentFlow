"use client";

import { useActionState, useTransition } from "react";
import { createReportSubscription, deleteReportSubscription } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Subscription = {
  id: string;
  recipientEmail: string;
  frequency: "weekly" | "monthly";
  lastSentAt: Date | null;
};

function DeleteSubscriptionButton({
  subscriptionId,
  campaignId,
}: {
  subscriptionId: string;
  campaignId: string;
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => deleteReportSubscription(subscriptionId, campaignId))}
    >
      Remove
    </Button>
  );
}

export function ReportSubscriptions({
  campaignId,
  subscriptions,
}: {
  campaignId: string;
  subscriptions: Subscription[];
}) {
  const createForCampaign = createReportSubscription.bind(null, campaignId);
  const [state, formAction, pending] = useActionState(createForCampaign, undefined);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Envia automaticamente o link do relatório por email, no ritmo que escolheres - sem
        precisares de partilhar o link à mão de cada vez.
      </p>

      {subscriptions.length > 0 && (
        <div className="flex flex-col divide-y">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{sub.recipientEmail}</span>
                <span className="text-xs text-muted-foreground">
                  {sub.frequency === "weekly" ? "Semanal" : "Mensal"} -{" "}
                  {sub.lastSentAt
                    ? `último envio ${sub.lastSentAt.toLocaleDateString()}`
                    : "ainda sem envios"}
                </span>
              </div>
              <DeleteSubscriptionButton subscriptionId={sub.id} campaignId={campaignId} />
            </div>
          ))}
        </div>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recipientEmail" className="text-xs">
            Email do destinatário
          </Label>
          <Input
            id="recipientEmail"
            name="recipientEmail"
            type="email"
            placeholder="cliente@exemplo.com"
            required
            className="w-56"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="frequency" className="text-xs">
            Frequência
          </Label>
          <select
            id="frequency"
            name="frequency"
            defaultValue="weekly"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "A adicionar…" : "Adicionar"}
        </Button>
      </form>
      {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
    </div>
  );
}

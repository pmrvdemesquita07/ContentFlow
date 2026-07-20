import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getContractDetail, paidTotal } from "@/lib/contracts";
import { planAtLeast } from "@/lib/plan";
import { Card, CardContent } from "@/components/ui/card";
import { ContractStatusSelect } from "./contract-status-select";
import { PaymentStatusSelect } from "./payment-status-select";
import { AddPaymentForm } from "./add-payment-form";
import { DeleteContractButton } from "./delete-contract-button";
import { DeletePaymentButton } from "./delete-payment-button";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;
  if (!planAtLeast(ctx.workspace.plan, "pro")) redirect("/settings?upgrade=1");

  const contract = await getContractDetail(id, ctx.workspace.id);
  if (!contract) notFound();

  const total = Number(contract.amount);
  const paid = paidTotal(contract.payments);
  const outstanding = total - paid;
  const currencyFmt = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: contract.currency });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{contract.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {contract.creator.name}
            {contract.campaign && (
              <>
                {" - "}
                <Link href={`/campaigns/${contract.campaign.id}`} className="hover:underline">
                  {contract.campaign.name}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ContractStatusSelect contractId={contract.id} status={contract.status} />
          <DeleteContractButton contractId={contract.id} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Contract total</p>
            <p className="text-2xl font-semibold">{currencyFmt(total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-2xl font-semibold">{currencyFmt(paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-semibold">{currencyFmt(outstanding)}</p>
          </CardContent>
        </Card>
      </div>

      {contract.notes && (
        <Card>
          <CardContent className="pt-5">
            <h2 className="mb-2 text-sm font-semibold">Notes</h2>
            <p className="text-sm text-muted-foreground">{contract.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Payments</h2>
          {contract.payments.length === 0 ? (
            <p className="mb-3 text-sm text-muted-foreground">
              No payments recorded yet - add one below.
            </p>
          ) : (
            <div className="mb-4 flex flex-col divide-y">
              {contract.payments.map((payment) => (
                <div key={payment.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-24 shrink-0 text-sm font-medium">
                    {currencyFmt(Number(payment.amount))}
                  </span>
                  {payment.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      Due {new Date(payment.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {payment.notes && (
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {payment.notes}
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <PaymentStatusSelect
                      paymentId={payment.id}
                      contractId={contract.id}
                      status={payment.status}
                    />
                    <DeletePaymentButton paymentId={payment.id} contractId={contract.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <AddPaymentForm contractId={contract.id} />
        </CardContent>
      </Card>
    </div>
  );
}

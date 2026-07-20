import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import {
  getContractsForWorkspace,
  getCreatorsForWorkspaceOptions,
  getCampaignsForWorkspaceOptions,
  paidTotal,
} from "@/lib/contracts";
import { planAtLeast } from "@/lib/plan";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewContractForm } from "./new-contract-form";

const STATUS_VARIANT: Record<string, "outline" | "success" | "secondary"> = {
  draft: "outline",
  sent: "secondary",
  signed: "secondary",
  completed: "success",
  cancelled: "outline",
};

export default async function ContractsPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;
  if (ctx.workspace.type === "creator") redirect("/dashboard");
  if (!planAtLeast(ctx.workspace.plan, "pro")) redirect("/settings?upgrade=1");

  const [contracts, creators, campaigns] = await Promise.all([
    getContractsForWorkspace(ctx.workspace.id),
    getCreatorsForWorkspaceOptions(ctx.workspace.id),
    getCampaignsForWorkspaceOptions(ctx.workspace.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Contracts</h1>
        <p className="text-sm text-muted-foreground">
          Agreements with creators and the payments owed under each one.
        </p>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">
              No contracts yet. Create one below.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {contracts.map((contract) => {
            const paid = paidTotal(contract.payments);
            const total = Number(contract.amount);
            return (
              <Link
                key={contract.id}
                href={`/contracts/${contract.id}`}
                className="flex items-center gap-3 p-4 hover:bg-accent/50"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{contract.title}</span>
                    <Badge variant={STATUS_VARIANT[contract.status] ?? "outline"} className="capitalize">
                      {contract.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{contract.creator.name}</span>
                    {contract.campaign && <span>{contract.campaign.name}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold">
                    {total.toLocaleString(undefined, { style: "currency", currency: contract.currency })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {paid.toLocaleString(undefined, { style: "currency", currency: contract.currency })}{" "}
                    paid
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Card className="max-w-2xl">
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">New contract</h2>
          <NewContractForm creators={creators} campaigns={campaigns} />
        </CardContent>
      </Card>
    </div>
  );
}

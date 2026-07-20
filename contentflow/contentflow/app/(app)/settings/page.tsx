import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getDiscoveryProfile } from "@/lib/discovery";
import { getSocialAccountsForBrand } from "@/lib/social";
import { PLAN_LABELS } from "@/lib/plan";
import { SettingsForm } from "./settings-form";
import { DiscoveryProfileForm } from "./discovery-profile-form";
import { UpgradeButton, ManageBillingButton } from "./billing-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const isCreator = ctx.workspace.type === "creator";
  const [profile, accounts] = isCreator
    ? await Promise.all([
        getDiscoveryProfile(ctx.workspace.id),
        getSocialAccountsForBrand(ctx.brand.id),
      ])
    : [null, []];

  const { plan, stripeCustomerId } = ctx.workspace;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {ctx.workspace.name} - Brand Voice tunes every AI Assistant.
        </p>
      </div>
      {params.upgrade && (
        <div className="rounded-md border border-primary/30 bg-accent px-4 py-3 text-sm text-accent-foreground">
          Essa funcionalidade precisa de um plano superior - escolhe Pro ou Studio abaixo.
        </div>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Faturação</CardTitle>
            <Badge variant={plan === "starter" ? "outline" : "default"}>{PLAN_LABELS[plan]}</Badge>
          </div>
          <CardDescription>
            {plan === "starter"
              ? "Estás no plano gratuito. Muda para Pro ou Studio para desbloquear mais funcionalidades."
              : "Gere o teu plano, método de pagamento e faturas."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {plan === "starter" ? (
            <>
              <UpgradeButton plan="pro" label="Mudar para Pro" />
              <UpgradeButton plan="studio" label="Mudar para Studio" />
            </>
          ) : (
            stripeCustomerId && <ManageBillingButton />
          )}
        </CardContent>
      </Card>
      <SettingsForm brand={ctx.brand} />
      {isCreator && profile && (
        <DiscoveryProfileForm
          profile={profile}
          accounts={accounts.filter((a) => a.status === "connected")}
        />
      )}
    </div>
  );
}

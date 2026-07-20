import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getAgencyRoster } from "@/lib/agency";
import { planAtLeast } from "@/lib/plan";
import { Card, CardContent } from "@/components/ui/card";
import { SwitchBrandLink } from "./switch-brand-link";

export default async function AgencyPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;
  if (ctx.workspace.type !== "agency") redirect("/dashboard");
  if (!planAtLeast(ctx.workspace.plan, "studio")) redirect("/settings?upgrade=1");

  const roster = await getAgencyRoster(ctx.workspace.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Agency roster</h1>
        <p className="text-sm text-muted-foreground">
          Every brand in {ctx.workspace.name}, at a glance. Interactions are the trailing 30 days.
        </p>
      </div>

      {roster.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">
              No brands yet. Add one from{" "}
              <Link href="/brands" className="underline">
                Brands &amp; workspaces
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roster.map((brand) => (
            <Card key={brand.id} className={brand.id === ctx.brand?.id ? "border-primary" : undefined}>
              <CardContent className="flex flex-col gap-3 pt-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{brand.name}</h2>
                  <SwitchBrandLink brandId={brand.id} isCurrent={brand.id === ctx.brand?.id} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Followers</p>
                    <p className="font-semibold">{brand.followers.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Connected accounts</p>
                    <p className="font-semibold">{brand.connectedAccounts}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Posts</p>
                    <p className="font-semibold">{brand.postsCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Campaigns</p>
                    <p className="font-semibold">{brand.campaignsCount}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Interactions (30d)</p>
                  <p className="font-semibold">{brand.interactions30d.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

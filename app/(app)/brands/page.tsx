import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { Card, CardContent } from "@/components/ui/card";
import { NewBrandForm } from "./new-brand-form";
import { NewWorkspaceForm } from "./new-workspace-form";
import { SwitchBrandButton } from "./switch-brand-button";

export default async function BrandsPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Brands &amp; workspaces</h1>
        <p className="text-sm text-muted-foreground">
          Manage every brand and workspace you have access to, and switch between them.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {ctx.workspaces.map((workspace) => (
          <Card key={workspace.id}>
            <CardContent className="flex flex-col gap-3 pt-5">
              <h2 className="text-sm font-semibold">{workspace.name}</h2>
              <div className="flex flex-col divide-y">
                {workspace.brands.map((brand) => (
                  <div key={brand.id} className="flex items-center justify-between py-2">
                    <span className="text-sm">{brand.name}</span>
                    <SwitchBrandButton brandId={brand.id} isCurrent={brand.id === ctx.brand?.id} />
                  </div>
                ))}
              </div>
              <NewBrandForm workspaceId={workspace.id} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold">Create a new workspace</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Use a separate workspace for a different client or team - each keeps its own brands,
            content, and connected accounts.
          </p>
          <NewWorkspaceForm />
        </CardContent>
      </Card>
    </div>
  );
}

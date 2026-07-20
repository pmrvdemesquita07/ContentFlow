import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand, getArchivedWorkspaces } from "@/lib/workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewBrandForm } from "./new-brand-form";
import { NewWorkspaceForm } from "./new-workspace-form";
import { SwitchBrandButton } from "./switch-brand-button";
import { ArchiveWorkspaceButton } from "./archive-workspace-button";
import { RestoreWorkspaceButton } from "./restore-workspace-button";
import { DeleteWorkspaceDialog } from "./delete-workspace-dialog";

export default async function BrandsPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;

  const archivedWorkspaces = await getArchivedWorkspaces(user.id);
  const canCreateWorkspace = ctx.workspaces.some((w) => w.plan !== "starter");

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
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{workspace.name}</h2>
                <div className="flex items-center gap-2">
                  <ArchiveWorkspaceButton workspaceId={workspace.id} />
                  <DeleteWorkspaceDialog workspaceId={workspace.id} workspaceName={workspace.name} />
                </div>
              </div>
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
          {canCreateWorkspace ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Use a separate workspace for a different client or team - each keeps its own
                brands, content, and connected accounts.
              </p>
              <NewWorkspaceForm />
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Starter is limited to 1 workspace. Upgrade to Pro or Studio to add more.
              </p>
              <Button asChild size="sm">
                <Link href="/settings">Ver planos</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {archivedWorkspaces.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <h2 className="mb-3 text-sm font-semibold">Archived workspaces</h2>
            <div className="flex flex-col divide-y">
              {archivedWorkspaces.map((workspace) => (
                <div key={workspace.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{workspace.name}</span>
                    <Badge variant="outline">Archived</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <RestoreWorkspaceButton workspaceId={workspace.id} />
                    <DeleteWorkspaceDialog workspaceId={workspace.id} workspaceName={workspace.name} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

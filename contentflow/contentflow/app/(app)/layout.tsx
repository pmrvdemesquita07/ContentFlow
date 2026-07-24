import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getSearchIndex } from "@/lib/search";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { BrandSwitcher } from "@/components/workspace/brand-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandSearch } from "@/components/search/command-search";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);

  if (!ctx) redirect("/onboarding");

  const searchIndex = await getSearchIndex(ctx.workspace.id, ctx.workspace.type);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-muted/30 p-4">
        <Logo size="sm" className="mb-4 block" />
        <div className="mb-3">
          <BrandSwitcher
            workspaces={ctx.workspaces}
            currentWorkspaceName={ctx.workspace.name}
            currentBrandId={ctx.brand?.id}
            currentBrandName={ctx.brand?.name}
          />
        </div>
        <div className="mb-6">
          <CommandSearch index={searchIndex} />
        </div>
        <SidebarNav plan={ctx.workspace.plan} workspaceType={ctx.workspace.type} />
        {ctx.workspace.plan === "starter" && (
          <Link
            href="/settings"
            className="mb-2 rounded-md border border-dashed p-2.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
          >
            Estás no plano Starter -{" "}
            <span className="font-medium text-primary">upgrade</span> para desbloquear Campanhas,
            Tarefas, Contratos e mais.
          </Link>
        )}
        <div className="flex items-center gap-1">
          <form action={signOut} className="flex-1">
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              Sign out
            </Button>
          </form>
          <ThemeToggle />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}

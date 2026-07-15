"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Building2, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchBrand } from "@/app/actions/workspace";
import { cn } from "@/lib/utils";

type WorkspaceWithBrands = {
  id: string;
  name: string;
  brands: { id: string; name: string }[];
};

export function BrandSwitcher({
  workspaces,
  currentWorkspaceName,
  currentBrandId,
  currentBrandName,
}: {
  workspaces: WorkspaceWithBrands[];
  currentWorkspaceName: string;
  currentBrandId: string | undefined;
  currentBrandName: string | undefined;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={isPending}
          className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent"
        >
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">
              {currentBrandName ?? "Select brand"}
            </span>
            <span className="truncate text-xs text-muted-foreground">{currentWorkspaceName}</span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {workspaces.map((workspace, i) => (
          <div key={workspace.id}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
              <Building2 className="size-3" />
              {workspace.name}
            </DropdownMenuLabel>
            {workspace.brands.map((brand) => (
              <DropdownMenuItem
                key={brand.id}
                disabled={isPending}
                onClick={() => startTransition(() => switchBrand(brand.id))}
                className={cn(brand.id === currentBrandId && "font-medium")}
              >
                {brand.name}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/brands">Manage brands &amp; workspaces</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

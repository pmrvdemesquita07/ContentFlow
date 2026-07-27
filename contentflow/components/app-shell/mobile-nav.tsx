"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, FileText, Calendar, BarChart3, Menu, ChevronRight } from "lucide-react";
import type { Plan, WorkspaceType } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandSwitcher } from "@/components/workspace/brand-switcher";
import { CommandSearch } from "@/components/search/command-search";
import { signOut } from "@/app/actions/auth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  TOP_LINKS,
  GROUPS,
  SETTINGS_LINK,
  isLinkVisible,
  isLinkActive,
  type NavLink,
} from "@/lib/nav-links";

// The four everyday destinations that get a permanent thumb-reach icon;
// everything else (gated by plan or just less frequent) lives in "More".
const BAR_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/posts", label: "Posts", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];
const BAR_HREFS = new Set(BAR_LINKS.map((l) => l.href));

function BarItem({ link, active }: { link: NavLink; active: boolean }) {
  return (
    <Link
      href={link.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <link.icon className="size-5" />
      {link.label}
    </Link>
  );
}

function MoreNavItem({ link, active, onNavigate }: { link: NavLink; active: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
        active ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent"
      )}
    >
      <link.icon className="size-4 text-muted-foreground" />
      {link.label}
    </Link>
  );
}

type WorkspaceWithBrands = {
  id: string;
  name: string;
  brands: { id: string; name: string }[];
};

type SearchIndex = {
  brands: { id: string; label: string }[];
  campaigns: { id: string; label: string; sublabel?: string }[];
  creators: { id: string; label: string; sublabel?: string }[];
};

export function MobileNav({
  plan,
  workspaceType,
  workspaces,
  currentWorkspaceName,
  currentBrandId,
  currentBrandName,
  searchIndex,
}: {
  plan: Plan;
  workspaceType: WorkspaceType;
  workspaces: WorkspaceWithBrands[];
  currentWorkspaceName: string;
  currentBrandId: string | undefined;
  currentBrandName: string | undefined;
  searchIndex: SearchIndex;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const moreGroups = GROUPS.map((group) => ({
    ...group,
    links: group.links.filter((link) => isLinkVisible(link, plan, workspaceType) && !BAR_HREFS.has(link.href)),
  })).filter((group) => group.links.length > 0);

  const moreTopLinks = TOP_LINKS.filter(
    (link) => isLinkVisible(link, plan, workspaceType) && !BAR_HREFS.has(link.href)
  );

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        {BAR_LINKS.map((link) => (
          <BarItem key={link.href} link={link} active={isLinkActive(pathname, link.href)} />
        ))}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground"
            >
              <Menu className="size-5" />
              More
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 overflow-y-auto">
              <BrandSwitcher
                workspaces={workspaces}
                currentWorkspaceName={currentWorkspaceName}
                currentBrandId={currentBrandId}
                currentBrandName={currentBrandName}
              />
              <CommandSearch index={searchIndex} />

              <div className="flex flex-col gap-0.5">
                {moreTopLinks.map((link) => (
                  <MoreNavItem
                    key={link.href}
                    link={link}
                    active={isLinkActive(pathname, link.href)}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>

              {moreGroups.map((group) => (
                <div key={group.id} className="flex flex-col gap-0.5 border-t pt-3">
                  <div className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold text-muted-foreground">
                    <group.icon className="size-3.5" />
                    {group.label}
                    <ChevronRight className="ml-auto size-3 opacity-0" />
                  </div>
                  {group.links.map((link) => (
                    <MoreNavItem
                      key={link.href}
                      link={link}
                      active={isLinkActive(pathname, link.href)}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </div>
              ))}

              <div className="flex flex-col gap-0.5 border-t pt-3">
                <MoreNavItem
                  link={SETTINGS_LINK}
                  active={isLinkActive(pathname, SETTINGS_LINK.href)}
                  onNavigate={() => setOpen(false)}
                />
              </div>

              <div className="flex items-center gap-2 border-t pt-3">
                <form action={signOut} className="flex-1">
                  <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
                    Sign out
                  </Button>
                </form>
                <ThemeToggle />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}

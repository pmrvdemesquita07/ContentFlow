"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Plan, WorkspaceType } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";
import {
  TOP_LINKS,
  GROUPS,
  SETTINGS_LINK,
  SOON_LINKS,
  isLinkVisible,
  isLinkActive,
  type NavLink,
} from "@/lib/nav-links";

function NavItem({ link, active }: { link: NavLink; active: boolean }) {
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium hover:bg-accent",
        active ? "bg-accent text-accent-foreground" : "text-foreground"
      )}
    >
      <link.icon className="size-4 text-muted-foreground" />
      {link.label}
    </Link>
  );
}

export function SidebarNav({
  plan,
  workspaceType,
}: {
  plan: Plan;
  workspaceType: WorkspaceType;
}) {
  const pathname = usePathname();

  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    links: group.links.filter((link) => isLinkVisible(link, plan, workspaceType)),
  })).filter((group) => group.links.length > 0);

  // Manual toggles win once a group has been clicked; until then, a group
  // defaults open whenever the visitor is currently inside it - including
  // when they arrived there some other way (Cmd+K search, a direct link)
  // instead of clicking the group open themselves.
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});
  const activeGroupId = visibleGroups.find((group) =>
    group.links.some((link) => isLinkActive(pathname, link.href))
  )?.id;

  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      {TOP_LINKS.filter((link) => isLinkVisible(link, plan, workspaceType)).map((link) => (
        <NavItem key={link.href} link={link} active={isLinkActive(pathname, link.href)} />
      ))}

      {visibleGroups.map((group) => {
        const open = manualOverrides[group.id] ?? group.id === activeGroupId;
        return (
          <div key={group.id} className="border-t mt-1 pt-1 first:mt-0 first:border-t-0 first:pt-0">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setManualOverrides((prev) => ({ ...prev, [group.id]: !open }))}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-semibold text-foreground hover:bg-accent"
            >
              <group.icon className="size-4 text-muted-foreground" />
              {group.label}
              <ChevronRight
                className={cn(
                  "ml-auto size-3.5 text-muted-foreground transition-transform",
                  open && "rotate-90"
                )}
              />
            </button>
            {open && (
              <div className="flex flex-col gap-0.5 pl-[1.6rem]">
                {group.links.map((link) => (
                  <NavItem key={link.href} link={link} active={isLinkActive(pathname, link.href)} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="mt-1 border-t pt-1">
        <NavItem link={SETTINGS_LINK} active={isLinkActive(pathname, SETTINGS_LINK.href)} />
      </div>

      <div className="mt-4 mb-1 px-2.5 text-xs font-medium text-muted-foreground">Coming soon</div>
      {SOON_LINKS.map((link) => (
        <div
          key={link.label}
          className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground/60"
        >
          <link.icon className="size-4" />
          {link.label}
        </div>
      ))}
    </nav>
  );
}

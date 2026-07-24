"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Megaphone,
  SquareCheck,
  Inbox,
  FileText,
  Calendar,
  Image,
  BarChart3,
  Share2,
  Radar,
  Briefcase,
  Users,
  FileSignature,
  Compass,
  Building2,
  Settings,
  Lightbulb,
  Sparkles,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { planAtLeast } from "@/lib/plan";
import type { Plan, WorkspaceType } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  minPlan?: Plan;
  hideFor?: WorkspaceType[];
  requireType?: WorkspaceType[];
};

type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  links: NavLink[];
};

// Links used often enough that hiding them behind a group would slow people
// down - stay one click away for everyone. Settings is rendered separately,
// pinned to the bottom instead of at the end of this list.
const TOP_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone, minPlan: "pro" },
  { href: "/tasks", label: "Tasks", icon: SquareCheck, minPlan: "pro" },
  { href: "/mailbox", label: "Mailbox", icon: Inbox, minPlan: "pro" },
];

const GROUPS: NavGroup[] = [
  {
    id: "conteudo",
    label: "Conteúdo",
    icon: FileText,
    links: [
      { href: "/posts", label: "Posts", icon: FileText },
      { href: "/calendar", label: "Calendar", icon: Calendar },
      { href: "/media", label: "Media", icon: Image },
    ],
  },
  {
    id: "crescimento",
    label: "Crescimento",
    icon: BarChart3,
    links: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/social-hub", label: "Social Hub", icon: Share2 },
      { href: "/competitors", label: "Competitors", icon: Radar, minPlan: "pro" },
    ],
  },
  {
    id: "criadores",
    label: "Criadores & parcerias",
    icon: Users,
    links: [
      { href: "/opportunities", label: "Opportunities", icon: Briefcase, minPlan: "pro" },
      { href: "/creators", label: "Creators", icon: Users, minPlan: "pro", hideFor: ["creator"] },
      {
        href: "/contracts",
        label: "Contracts",
        icon: FileSignature,
        minPlan: "pro",
        hideFor: ["creator"],
      },
      {
        href: "/discover",
        label: "Discover creators",
        icon: Compass,
        minPlan: "studio",
        hideFor: ["creator"],
      },
      {
        href: "/agency",
        label: "Agency roster",
        icon: Building2,
        minPlan: "studio",
        requireType: ["agency"],
      },
    ],
  },
];

const SETTINGS_LINK: NavLink = { href: "/settings", label: "Settings", icon: Settings };

const SOON_LINKS = [
  { label: "Ideas Bank", icon: Lightbulb },
  { label: "Assistants", icon: Sparkles },
];

function isVisible(link: NavLink, plan: Plan, workspaceType: WorkspaceType) {
  if (link.minPlan && !planAtLeast(plan, link.minPlan)) return false;
  if (link.hideFor?.includes(workspaceType)) return false;
  if (link.requireType && !link.requireType.includes(workspaceType)) return false;
  return true;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
    links: group.links.filter((link) => isVisible(link, plan, workspaceType)),
  })).filter((group) => group.links.length > 0);

  // Manual toggles win once a group has been clicked; until then, a group
  // defaults open whenever the visitor is currently inside it - including
  // when they arrived there some other way (Cmd+K search, a direct link)
  // instead of clicking the group open themselves.
  const [manualOverrides, setManualOverrides] = useState<Record<string, boolean>>({});
  const activeGroupId = visibleGroups.find((group) =>
    group.links.some((link) => isActive(pathname, link.href))
  )?.id;

  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      {TOP_LINKS.filter((link) => isVisible(link, plan, workspaceType)).map((link) => (
        <NavItem key={link.href} link={link} active={isActive(pathname, link.href)} />
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
                  <NavItem key={link.href} link={link} active={isActive(pathname, link.href)} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="mt-1 border-t pt-1">
        <NavItem link={SETTINGS_LINK} active={isActive(pathname, SETTINGS_LINK.href)} />
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

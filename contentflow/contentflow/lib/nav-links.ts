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
  TrendingUp,
  Briefcase,
  Users,
  FileSignature,
  Compass,
  Building2,
  Settings,
  IdCard,
  Lightbulb,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { planAtLeast } from "@/lib/plan";
import type { Plan, WorkspaceType } from "@/lib/generated/prisma/enums";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  minPlan?: Plan;
  hideFor?: WorkspaceType[];
  requireType?: WorkspaceType[];
};

export type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  links: NavLink[];
};

// Links used often enough that hiding them behind a group would slow people
// down - stay one click away for everyone. Settings is rendered separately,
// pinned to the bottom instead of at the end of this list.
export const TOP_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone, minPlan: "pro" },
  { href: "/tasks", label: "Tasks", icon: SquareCheck, minPlan: "pro" },
  { href: "/mailbox", label: "Mailbox", icon: Inbox, minPlan: "pro" },
];

export const GROUPS: NavGroup[] = [
  {
    id: "conteudo",
    label: "Conteúdo",
    icon: FileText,
    links: [
      { href: "/ideas", label: "Ideas Bank", icon: Lightbulb },
      { href: "/posts", label: "Posts", icon: FileText },
      { href: "/calendar", label: "Calendar", icon: Calendar },
      { href: "/media", label: "Media", icon: Image },
      { href: "/assistants", label: "Assistants", icon: Sparkles },
    ],
  },
  {
    id: "crescimento",
    label: "Crescimento",
    icon: BarChart3,
    links: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/trends", label: "Trends", icon: TrendingUp, minPlan: "pro" },
      { href: "/social-hub", label: "Social Hub", icon: Share2 },
      { href: "/media-kit", label: "Media Kit", icon: IdCard },
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

export const SETTINGS_LINK: NavLink = { href: "/settings", label: "Settings", icon: Settings };

export const SOON_LINKS: { label: string; icon: LucideIcon }[] = [];

export function isLinkVisible(link: NavLink, plan: Plan, workspaceType: WorkspaceType) {
  if (link.minPlan && !planAtLeast(plan, link.minPlan)) return false;
  if (link.hideFor?.includes(workspaceType)) return false;
  if (link.requireType && !link.requireType.includes(workspaceType)) return false;
  return true;
}

export function isLinkActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

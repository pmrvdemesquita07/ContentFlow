import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Lightbulb,
  FileText,
  Calendar,
  SquareCheck,
  Share2,
  BarChart3,
  Sparkles,
  Image,
  Inbox,
  Settings,
  Megaphone,
  Building2,
  Users,
  FileSignature,
  Radar,
  Compass,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getSearchIndex } from "@/lib/search";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { BrandSwitcher } from "@/components/workspace/brand-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandSearch } from "@/components/search/command-search";

const ACTIVE_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/posts", label: "Posts", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: SquareCheck },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/media", label: "Media", icon: Image },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/mailbox", label: "Mailbox", icon: Inbox },
  { href: "/social-hub", label: "Social Hub", icon: Share2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const CREATORS_LINK = { href: "/creators", label: "Creators", icon: Users };
const CONTRACTS_LINK = { href: "/contracts", label: "Contracts", icon: FileSignature };
const COMPETITORS_LINK = { href: "/competitors", label: "Competitors", icon: Radar };
const DISCOVER_LINK = { href: "/discover", label: "Discover creators", icon: Compass };
const AGENCY_LINK = { href: "/agency", label: "Agency roster", icon: Building2 };

const SOON_LINKS = [
  { label: "Ideas Bank", icon: Lightbulb },
  { label: "Assistants", icon: Sparkles },
];

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
        <nav className="flex flex-1 flex-col gap-0.5">
          {ACTIVE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              <link.icon className="size-4 text-muted-foreground" />
              {link.label}
            </Link>
          ))}
          {ctx.workspace.type !== "creator" && (
            <Link
              href={CREATORS_LINK.href}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              <CREATORS_LINK.icon className="size-4 text-muted-foreground" />
              {CREATORS_LINK.label}
            </Link>
          )}
          {ctx.workspace.type !== "creator" && (
            <Link
              href={CONTRACTS_LINK.href}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              <CONTRACTS_LINK.icon className="size-4 text-muted-foreground" />
              {CONTRACTS_LINK.label}
            </Link>
          )}
          {ctx.workspace.type !== "creator" && (
            <Link
              href={DISCOVER_LINK.href}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              <DISCOVER_LINK.icon className="size-4 text-muted-foreground" />
              {DISCOVER_LINK.label}
            </Link>
          )}
          <Link
            href={COMPETITORS_LINK.href}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            <COMPETITORS_LINK.icon className="size-4 text-muted-foreground" />
            {COMPETITORS_LINK.label}
          </Link>
          {ctx.workspace.type === "agency" && (
            <Link
              href={AGENCY_LINK.href}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              <AGENCY_LINK.icon className="size-4 text-muted-foreground" />
              {AGENCY_LINK.label}
            </Link>
          )}
          <div className="mt-4 mb-1 px-2.5 text-xs font-medium text-muted-foreground">
            Coming soon
          </div>
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

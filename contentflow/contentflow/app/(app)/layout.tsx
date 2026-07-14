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
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const ACTIVE_LINKS = [
  { href: "/ideas", label: "Ideas Bank", icon: Lightbulb },
  { href: "/posts", label: "Posts", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: SquareCheck },
  { href: "/media", label: "Media", icon: Image },
  { href: "/settings", label: "Settings", icon: Settings },
];

const SOON_LINKS = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Social Hub", icon: Share2 },
  { label: "Analytics", icon: BarChart3 },
  { label: "Assistants", icon: Sparkles },
  { label: "Mailbox", icon: Inbox },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);

  if (!ctx) redirect("/onboarding");

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r bg-muted/30 p-4">
        <div className="mb-6 px-2">
          <p className="text-sm font-semibold">{ctx.workspace.name}</p>
          <p className="text-xs text-muted-foreground">{ctx.brand?.name}</p>
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
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
            Sign out
          </Button>
        </form>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}

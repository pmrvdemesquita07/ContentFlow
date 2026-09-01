import Link from "next/link";
import { Sparkles, MessageSquare, FileText, CalendarClock, IdCard, BadgeEuro, Lock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { checkAiUsage } from "@/lib/ai/usage";
import { canAccessAiReply, canAccessAiBriefing } from "@/lib/ai/access";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AssistantEntry = {
  icon: typeof Sparkles;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  locked?: boolean;
};

export default async function AssistantsPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const usage = await checkAiUsage(ctx.workspace.id, ctx.workspace.plan);
  const replyLocked = !canAccessAiReply(ctx.workspace.plan);
  const briefingLocked = !canAccessAiBriefing(ctx.workspace.plan);

  const assistants: AssistantEntry[] = [
    {
      icon: Sparkles,
      title: "Captions",
      description:
        "Three caption/hook suggestions grounded in your brand voice, and - when the post already has one - its campaign and target platforms.",
      href: "/posts",
      linkLabel: "Open a post's Details tab",
    },
    {
      icon: CalendarClock,
      title: "Quick Schedule",
      description:
        "Turn a free-text note (\"Reel sobre café gelado amanhã às 18h\") straight into a scheduled post on the Calendar.",
      href: "/calendar",
      linkLabel: "Go to Calendar",
    },
    {
      icon: MessageSquare,
      title: "Reply suggestions",
      description: "One suggested reply for a marketplace conversation, from the recent message history.",
      href: "/opportunities",
      linkLabel: "Open a conversation",
      locked: replyLocked,
    },
    {
      icon: FileText,
      title: "Briefing drafts",
      description: "A 3-5 sentence campaign or opportunity brief from an objective, budget, deadline and tone.",
      href: "/campaigns",
      linkLabel: "New campaign",
      locked: briefingLocked,
    },
    {
      icon: IdCard,
      title: "Media Kit pitch",
      description: "A short pitch built from your real synced numbers - followers, engagement rate, best format.",
      href: "/media-kit",
      linkLabel: "Go to Media Kit",
    },
    {
      icon: BadgeEuro,
      title: "Pricing suggestion",
      description: "A price range for a new contract, based on that creator's own past contracts in this workspace.",
      href: "/contracts",
      linkLabel: "New contract",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Assistants</h1>
        <p className="text-sm text-muted-foreground">
          Every AI assistant lives inside the flow it helps with, not in a separate chat - here&apos;s
          where to find each one.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {usage.used} / {usage.limit} generations used this month across all assistants. Resets on the 1st.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assistants.map((a) => (
          <Card key={a.title}>
            <CardContent className="flex flex-col gap-3 pt-5">
              <div className="flex items-center justify-between">
                <a.icon className="size-5 text-primary" />
                {a.locked && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Lock className="size-3" />
                    Studio
                  </Badge>
                )}
              </div>
              <div>
                <h2 className="font-medium">{a.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
              </div>
              <Link href={a.href} className="text-sm font-medium text-primary hover:underline">
                {a.linkLabel} →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

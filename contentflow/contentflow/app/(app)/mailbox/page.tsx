import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, Send, Heart, Users2, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getMessagesForWorkspace } from "@/lib/mailbox";
import { getNotificationFeed, getDailyDigest } from "@/lib/notifications";
import { planAtLeast } from "@/lib/plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageRow } from "./message-row";
import type { MessageStatus } from "@/lib/generated/prisma/enums";

const FILTERS: { label: string; value: "all" | MessageStatus }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
  { label: "Replied", value: "replied" },
];

function DeltaLabel({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">avg</span>;
  const positive = value > 0;
  return (
    <span className={cn("text-xs font-medium", positive ? "text-success" : "text-destructive")}>
      {positive ? "+" : ""}
      {value.toFixed(0)}
      {suffix} vs avg
    </span>
  );
}

function DigestStat({
  icon: Icon,
  label,
  value,
  average,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  average: number;
}) {
  const diff = average > 0 ? ((value - average) / average) * 100 : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="text-xl font-semibold">{value.toLocaleString()}</p>
      <DeltaLabel value={diff} suffix="%" />
    </div>
  );
}

export default async function MailboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;
  if (!planAtLeast(ctx.workspace.plan, "pro")) redirect("/settings?upgrade=1");

  const activeFilter = FILTERS.some((f) => f.value === status) ? status : "all";
  const [messages, activity, digest] = await Promise.all([
    getMessagesForWorkspace(
      ctx.workspace.id,
      activeFilter === "all" ? undefined : (activeFilter as MessageStatus)
    ),
    ctx.brand ? getNotificationFeed(ctx.brand.id, ctx.workspace.id) : Promise.resolve([]),
    ctx.brand ? getDailyDigest(ctx.brand.id) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Mailbox</h1>
        <p className="text-sm text-muted-foreground">
          Every comment and DM from every connected platform, in one place.
        </p>
      </div>

      {digest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              Yesterday&apos;s recap - {digest.date.toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!digest.hasData ? (
              <p className="text-sm text-muted-foreground">
                No activity synced for yesterday yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <DigestStat icon={Send} label="Posts" value={digest.posts} average={digest.averages.posts} />
                <DigestStat
                  icon={Users2}
                  label="New followers"
                  value={digest.followerDelta}
                  average={digest.averages.followerDelta}
                />
                <DigestStat
                  icon={MessageCircle}
                  label="Comments"
                  value={digest.comments}
                  average={digest.averages.comments}
                />
                <DigestStat icon={Heart} label="Likes" value={digest.likes} average={digest.averages.likes} />
                <DigestStat
                  icon={TrendingUp}
                  label="Reach"
                  value={digest.reach}
                  average={digest.averages.reach}
                />
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Compared against this brand&apos;s own trailing 30-day daily average - Instagram
              doesn&apos;t expose who liked or who followed, only totals.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No comments or messages synced yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {activity.map((item) => (
                <li key={item.id} className="flex items-start gap-3 py-2.5">
                  {item.type === "comment" ? (
                    <MessageCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Send className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">@{item.actor}</span>
                      {item.unread && <Badge variant="default">New</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {item.type === "comment" ? "commented" : "sent a message"}
                      </span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{item.body}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(item.at).toLocaleString()}</span>
                      {item.contentTitle && <span>on &quot;{item.contentTitle}&quot;</span>}
                    </div>
                  </div>
                  {item.type === "comment" && (
                    <Link
                      href="/social-hub"
                      className="shrink-0 text-xs font-medium text-primary hover:underline"
                    >
                      Reply
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Messages</h2>
        <div className="flex gap-1 border-b">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={f.value === "all" ? "/mailbox" : `/mailbox?status=${f.value}`}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium",
                activeFilter === f.value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {messages.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No messages yet. Once you connect a platform in Social Hub, DMs will start showing up
            here.
          </p>
        ) : (
          <div className="mt-4 flex flex-col divide-y rounded-lg border">
            {messages.map((message) => (
              <MessageRow key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

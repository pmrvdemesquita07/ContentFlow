import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getMessagesForWorkspace } from "@/lib/mailbox";
import { cn } from "@/lib/utils";
import { MessageRow } from "./message-row";
import type { MessageStatus } from "@/lib/generated/prisma/enums";

const FILTERS: { label: string; value: "all" | MessageStatus }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
  { label: "Replied", value: "replied" },
];

export default async function MailboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;

  const activeFilter = FILTERS.some((f) => f.value === status) ? status : "all";
  const messages = await getMessagesForWorkspace(
    ctx.workspace.id,
    activeFilter === "all" ? undefined : (activeFilter as MessageStatus)
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Mailbox</h1>
        <p className="text-sm text-muted-foreground">
          Every comment and DM from every connected platform, in one place.
        </p>
      </div>

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
        <p className="text-sm text-muted-foreground">
          No messages yet. Once you connect a platform in Social Hub, comments and DMs will
          start showing up here.
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {messages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  );
}

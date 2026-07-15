"use client";

import Link from "next/link";
import { updateMessageStatus } from "@/app/actions/mailbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MessageWithContent } from "@/lib/types";

const STATUS_VARIANT = {
  unread: "default",
  read: "secondary",
  replied: "success",
} as const;

export function MessageRow({ message }: { message: MessageWithContent }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{message.sender}</span>
          <Badge variant="outline" className="capitalize">
            {message.platform}
          </Badge>
          <Badge variant={STATUS_VARIANT[message.status]}>{message.status}</Badge>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">{message.body}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{new Date(message.receivedAt).toLocaleString()}</span>
          {message.content && (
            <Link href="/posts" className="hover:text-foreground hover:underline">
              on &quot;{message.content.title}&quot;
            </Link>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {message.status !== "read" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateMessageStatus(message.id, "read")}
          >
            Mark read
          </Button>
        )}
        {message.status !== "replied" && (
          <Button size="sm" onClick={() => updateMessageStatus(message.id, "replied")}>
            Mark replied
          </Button>
        )}
      </div>
    </div>
  );
}

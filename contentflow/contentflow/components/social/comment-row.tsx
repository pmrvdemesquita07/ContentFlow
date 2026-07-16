"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { replyToComment, markCommentRead } from "@/app/actions/comments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STATUS_VARIANT = {
  unread: "default",
  read: "secondary",
  replied: "success",
} as const;

type CommentWithContent = {
  id: string;
  authorUsername: string;
  body: string;
  publishedAt: Date;
  status: "unread" | "read" | "replied";
  replyText: string | null;
  content: { id: string; title: string; thumbnailUrl: string | null };
};

export function CommentRow({ comment }: { comment: CommentWithContent }) {
  const [replying, setReplying] = useState(false);
  const replyAction = replyToComment.bind(null, comment.id);
  const [state, formAction, pending] = useActionState(replyAction, undefined);

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">@{comment.authorUsername}</span>
            <Badge variant={STATUS_VARIANT[comment.status]}>{comment.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{comment.body}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{new Date(comment.publishedAt).toLocaleString()}</span>
            <span>on &quot;{comment.content.title}&quot;</span>
          </div>
        </div>
        {comment.content.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comment.content.thumbnailUrl}
            alt=""
            className="size-10 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="size-10 shrink-0 rounded bg-muted" />
        )}
      </div>

      {comment.status === "replied" && comment.replyText ? (
        <p className="ml-2 border-l-2 pl-3 text-sm text-muted-foreground">
          You replied: {comment.replyText}
        </p>
      ) : replying ? (
        <form action={formAction} className="ml-2 flex flex-col gap-2 border-l-2 pl-3">
          <Textarea
            name="message"
            rows={2}
            defaultValue={`@${comment.authorUsername} `}
            placeholder="Write a reply…"
            required
          />
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Sending…" : "Send reply"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setReplying(false)}>
              Cancel
            </Button>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        </form>
      ) : (
        <div className="ml-2 flex items-center gap-3 pl-3">
          <button
            type="button"
            onClick={() => setReplying(true)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Reply
          </button>
          {comment.status === "unread" && (
            <button
              type="button"
              onClick={() => markCommentRead(comment.id)}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Mark read
            </button>
          )}
          <Link
            href="/posts"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            View post
          </Link>
        </div>
      )}
    </div>
  );
}

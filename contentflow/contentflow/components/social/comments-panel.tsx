"use client";

import { useMemo, useState } from "react";
import { CommentRow } from "@/components/social/comment-row";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";

type CommentWithContent = Parameters<typeof CommentRow>[0]["comment"] & { platform: SocialPlatform };

const PLATFORM_LABELS: Partial<Record<SocialPlatform, string>> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
};

export function CommentsPanel({ comments }: { comments: CommentWithContent[] }) {
  const [platform, setPlatform] = useState<SocialPlatform | "all">("all");

  const platformsPresent = useMemo(
    () => [...new Set(comments.map((c) => c.platform))],
    [comments]
  );
  const filtered = platform === "all" ? comments : comments.filter((c) => c.platform === platform);
  const needReply = comments.filter((c) => c.status === "unread").length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">{comments.length} comments</span>
        {needReply > 0 && (
          <span className="rounded-full bg-warning px-2 py-0.5 font-medium text-warning-foreground">
            {needReply} need reply
          </span>
        )}
      </div>

      {platformsPresent.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={platform === "all"} onClick={() => setPlatform("all")}>
            All platforms
          </FilterChip>
          {platformsPresent.map((p) => (
            <FilterChip key={p} active={platform === p} onClick={() => setPlatform(p)}>
              {PLATFORM_LABELS[p] ?? p}
            </FilterChip>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {comments.length === 0
            ? "No comments synced yet - they'll show up here after the next sync."
            : "No comments for this platform."}
        </p>
      ) : (
        <div className="flex flex-col divide-y">
          {filtered.map((comment) => (
            <CommentRow key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
          : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
      }
    >
      {children}
    </button>
  );
}

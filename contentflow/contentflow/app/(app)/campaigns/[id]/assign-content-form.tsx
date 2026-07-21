"use client";

import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { assignContentToCampaign } from "@/app/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type UnassignedContent = {
  id: string;
  title: string;
  type: string;
  status: string;
  thumbnailUrl: string | null;
};

export function AssignContentForm({
  campaignId,
  unassigned,
}: {
  campaignId: string;
  unassigned: UnassignedContent[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unassigned;
    return unassigned.filter((c) => c.title.toLowerCase().includes(q));
  }, [unassigned, query]);

  function assign(contentId: string) {
    setPendingId(contentId);
    startTransition(async () => {
      await assignContentToCampaign(contentId, campaignId);
      setPendingId(null);
      setOpen(false);
      setQuery("");
    });
  }

  if (unassigned.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No unassigned posts available - everything is already in a campaign.
      </p>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" className="w-fit" onClick={() => setOpen(true)}>
        Add a post
      </Button>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a post to this campaign</DialogTitle>
          <DialogDescription>Search by title, or pick straight from the thumbnails.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts by title..."
            className="pl-9"
            autoFocus
          />
        </div>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No posts match &quot;{query}&quot;.</p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={isPending}
                onClick={() => assign(c.id)}
                className="flex flex-col gap-1.5 rounded-md border p-2 text-left transition-colors hover:border-primary hover:bg-accent/50 disabled:opacity-50"
              >
                {c.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.thumbnailUrl}
                    alt=""
                    className="aspect-square w-full rounded object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                    No image
                  </div>
                )}
                <p className="truncate text-xs font-medium">{c.title}</p>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                    {c.type}
                  </Badge>
                  <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">
                    {pendingId === c.id ? "Adding…" : c.status}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

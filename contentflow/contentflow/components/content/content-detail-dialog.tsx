"use client";

import { useActionState, useState } from "react";
import type { ContentWithRelations } from "@/lib/types";
import { updateContent, deleteContent } from "@/app/actions/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PLATFORM_OPTIONS, STATUS_OPTIONS, TYPE_OPTIONS } from "./options";
import { TaskList } from "./task-list";
import { MediaSection } from "./media-section";
import { ContentMetrics } from "./content-metrics";

export function ContentDetailDialog({
  content,
  children,
}: {
  content: ContentWithRelations;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const updateWithId = updateContent.bind(null, content.id);
  const [state, formAction, pending] = useActionState(updateWithId, undefined);
  const [platforms, setPlatforms] = useState<string[]>(content.platforms);

  async function handleDelete() {
    if (!confirm(`Delete "${content.title}"? This can't be undone.`)) return;
    await deleteContent(content.id);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className="text-left">
        {children}
      </button>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="metrics">
          <TabsList className="w-full">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="tasks">Tasks{content.tasks.length > 0 && ` (${content.tasks.length})`}</TabsTrigger>
            <TabsTrigger value="media">Media{content.media.length > 0 && ` (${content.media.length})`}</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics">
            <ContentMetrics content={content} />
          </TabsContent>

          <TabsContent value="details">
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={content.title} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="body">Body</Label>
                <Textarea id="body" name="body" defaultValue={content.body ?? ""} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="type">Type</Label>
                  <Select name="type" defaultValue={content.type}>
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={content.status}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scheduledAt">Scheduled for</Label>
                <Input
                  id="scheduledAt"
                  name="scheduledAt"
                  type="datetime-local"
                  defaultValue={toLocalInputValue(content.scheduledAt)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((p) => {
                    const checked = platforms.includes(p.value);
                    return (
                      <label
                        key={p.value}
                        className="flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                      >
                        <input
                          type="checkbox"
                          name="platforms"
                          value={p.value}
                          className="sr-only"
                          checked={checked}
                          onChange={(e) =>
                            setPlatforms((prev) =>
                              e.target.checked
                                ? [...prev, p.value]
                                : prev.filter((v) => v !== p.value)
                            )
                          }
                        />
                        {p.label}
                      </label>
                    );
                  })}
                </div>
              </div>
              {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
              <DialogFooter className="justify-between sm:justify-between">
                <Button type="button" variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="tasks">
            <TaskList content={content} />
          </TabsContent>

          <TabsContent value="media">
            <MediaSection content={content} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function toLocalInputValue(date: Date | null) {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

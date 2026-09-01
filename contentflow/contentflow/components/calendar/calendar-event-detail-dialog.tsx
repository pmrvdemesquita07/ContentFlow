"use client";

import { useActionState, useState } from "react";
import { updateCalendarEvent, updateCalendarEventStatus, deleteCalendarEvent } from "@/app/actions/calendar-events";
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
import type { CalendarEventType } from "@/lib/generated/prisma/enums";

const TYPE_OPTIONS = [
  { value: "content_approval", label: "Content approval deadline" },
  { value: "contract_deadline", label: "Contract reminder" },
  { value: "custom", label: "Custom" },
];

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type CalendarEventForDialog = {
  id: string;
  title: string;
  type: CalendarEventType;
  status: string;
  startAt: Date;
  notes: string | null;
  campaign: { id: string; name: string } | null;
  contract: { id: string; title: string } | null;
  creator: { id: string; name: string } | null;
};

export function CalendarEventDetailDialog({
  event,
  children,
}: {
  event: CalendarEventForDialog;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const updateWithId = updateCalendarEvent.bind(null, event.id);
  const [state, formAction, pending] = useActionState(updateWithId, undefined);

  async function handleDelete() {
    if (!confirm(`Delete "${event.title}"? This can't be undone.`)) return;
    await deleteCalendarEvent(event.id);
    setOpen(false);
  }

  async function handleMarkDone() {
    await updateCalendarEventStatus(event.id, event.status === "done" ? "scheduled" : "done");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} className="w-full text-left">
        {children}
      </button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-event-title">Title</Label>
            <Input id="edit-event-title" name="title" defaultValue={event.title} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-event-type">Type</Label>
            <Select name="type" defaultValue={event.type}>
              <SelectTrigger id="edit-event-type" className="w-full">
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
            <Label htmlFor="edit-event-startAt">Date</Label>
            <Input
              id="edit-event-startAt"
              name="startAt"
              type="datetime-local"
              defaultValue={toLocalInputValue(event.startAt)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-event-notes">Notes</Label>
            <Textarea id="edit-event-notes" name="notes" rows={3} defaultValue={event.notes ?? ""} />
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
            {event.campaign && <span>Campaign: {event.campaign.name}</span>}
            {event.contract && <span>· Contract: {event.contract.title}</span>}
            {event.creator && <span>· Creator: {event.creator.name}</span>}
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleMarkDone}>
                {event.status === "done" ? "Mark scheduled" : "Mark done"}
              </Button>
              <Button type="button" variant="ghost" className="text-destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

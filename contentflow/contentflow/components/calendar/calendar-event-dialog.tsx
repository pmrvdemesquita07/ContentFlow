"use client";

import { useState, useTransition } from "react";
import { CalendarPlus } from "lucide-react";
import { createCalendarEvent } from "@/app/actions/calendar-events";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_OPTIONS = [
  { value: "content_approval", label: "Content approval deadline" },
  { value: "contract_deadline", label: "Contract reminder" },
  { value: "custom", label: "Custom" },
];

export function CalendarEventDialog({
  campaigns,
  creators,
  contracts,
  defaultStartAt,
}: {
  campaigns: { id: string; name: string }[];
  creators: { id: string; name: string }[];
  contracts: { id: string; title: string }[];
  /** Prefills the date when opened from a specific day cell, e.g. "2026-09-05T09:00". */
  defaultStartAt?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ error?: string } | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createCalendarEvent(undefined, formData);
      setState(result);
      if (!result?.error) setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarPlus />
          New event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New calendar event</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" name="title" required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-type">Type</Label>
            <Select name="type" defaultValue="content_approval">
              <SelectTrigger id="event-type" className="w-full">
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
            <Label htmlFor="event-startAt">Date</Label>
            <Input
              id="event-startAt"
              name="startAt"
              type="datetime-local"
              required
              defaultValue={defaultStartAt}
            />
          </div>
          {campaigns.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-campaignId">Campaign (optional)</Label>
              <select
                id="event-campaignId"
                name="campaignId"
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">No campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {creators.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-creatorId">Creator (optional)</Label>
              <select
                id="event-creatorId"
                name="creatorId"
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">No creator</option>
                {creators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {contracts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-contractId">Contract (optional)</Label>
              <select
                id="event-contractId"
                name="contractId"
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">No contract</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-notes">Notes</Label>
            <Textarea id="event-notes" name="notes" rows={3} />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

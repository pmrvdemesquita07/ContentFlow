"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { createContent } from "@/app/actions/content";
import type { ContentStatus } from "@/lib/generated/prisma/enums";
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
import { TYPE_OPTIONS } from "./options";

export function NewContentDialog({
  defaultStatus,
  triggerLabel,
  showScheduledAt = false,
}: {
  defaultStatus: ContentStatus;
  triggerLabel: string;
  showScheduledAt?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createContent, undefined);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New content</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await formAction(formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="status" value={defaultStatus} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-title">Title</Label>
            <Input id="new-title" name="title" required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-body">Body</Label>
            <Textarea id="new-body" name="body" rows={4} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-type">Type</Label>
            <Select name="type" defaultValue="post">
              <SelectTrigger id="new-type" className="w-full">
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
          {showScheduledAt && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-scheduledAt">Scheduled for</Label>
              <Input id="new-scheduledAt" name="scheduledAt" type="datetime-local" />
            </div>
          )}
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

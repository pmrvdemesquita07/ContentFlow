"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createContent } from "@/app/actions/content";
import type { ContentStatus } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CaptionAssistant } from "./caption-assistant";

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
  const [state, setState] = useState<{ error?: string } | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [type, setType] = useState("post");
  const [repeatWeekly, setRepeatWeekly] = useState(false);

  // Only closes the dialog once a submission actually succeeds - otherwise
  // (e.g. an invalid "repeat until" date) the dialog would vanish along
  // with the error message it's showing.
  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createContent(undefined, formData);
      setState(result);
      if (!result?.error) setOpen(false);
    });
  }

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
        <CaptionAssistant contentType={type} onUse={(text) => setBody(text)} />
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="status" value={defaultStatus} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-title">Title</Label>
            <Input id="new-title" name="title" required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-body">Body</Label>
            <Textarea
              id="new-body"
              name="body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-type">Type</Label>
            <Select name="type" defaultValue="post" onValueChange={setType}>
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
          {showScheduledAt && (
            <div className="flex flex-col gap-3 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="new-repeatWeekly"
                  checked={repeatWeekly}
                  onCheckedChange={(checked) => setRepeatWeekly(checked === true)}
                />
                <input type="hidden" name="repeatWeekly" value={repeatWeekly ? "on" : ""} />
                <Label htmlFor="new-repeatWeekly" className="cursor-pointer font-normal">
                  Repeat weekly, same day and time
                </Label>
              </div>
              {repeatWeekly && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-repeatUntil">Repeat until</Label>
                  <Input id="new-repeatUntil" name="repeatUntil" type="date" required />
                </div>
              )}
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

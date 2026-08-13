"use client";

import { useActionState, useRef } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { quickScheduleContent } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const TYPE_LABELS: Record<string, string> = {
  post: "Post",
  story: "Story",
  reel: "Reel",
  video: "Video",
  carousel: "Carousel",
};

export function QuickSchedule() {
  const [state, formAction, pending] = useActionState(quickScheduleContent, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-primary" />
          Quick schedule
        </div>
        <form
          ref={formRef}
          action={async (formData) => {
            await formAction(formData);
            formRef.current?.reset();
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <Input
            name="text"
            placeholder='e.g. "Reel about our new cold brew tomorrow at 6pm"'
            required
            className="flex-1"
          />
          <Button type="submit" disabled={pending} className="shrink-0">
            {pending ? "Scheduling…" : "Add to calendar"}
          </Button>
        </form>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.created && (
          <p className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            Added &quot;{state.created.title}&quot; ({TYPE_LABELS[state.created.type] ?? state.created.type}) for{" "}
            {new Date(state.created.scheduledAt).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}

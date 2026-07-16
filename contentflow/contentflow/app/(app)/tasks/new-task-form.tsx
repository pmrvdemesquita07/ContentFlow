"use client";

import { useActionState } from "react";
import { createStandaloneTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewTaskForm() {
  const [state, formAction, pending] = useActionState(createStandaloneTask, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-end sm:gap-2">
      <div className="flex flex-1 flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="new-task-title">
          New reminder
        </label>
        <Input id="new-task-title" name="title" placeholder="Add a task…" required />
      </div>
      <select
        name="priority"
        defaultValue="medium"
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm outline-none"
        aria-label="Priority"
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <Input name="dueDate" type="date" className="w-full sm:w-36" aria-label="Due date" />
      <Button type="submit" disabled={pending}>
        Add task
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

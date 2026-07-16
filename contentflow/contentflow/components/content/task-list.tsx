"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { createTask, updateTaskStatus, updateTaskPriority, deleteTask } from "@/app/actions/tasks";
import type { ContentWithRelations } from "@/lib/types";
import type { TaskPriority } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PriorityBadge } from "@/components/tasks/priority-badge";

export function TaskList({ content }: { content: ContentWithRelations }) {
  const createForContent = createTask.bind(null, content.id);
  const [state, formAction, pending] = useActionState(createForContent, undefined);

  return (
    <div className="flex flex-col gap-4">
      {content.tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tasks yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {content.tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-accent/50"
            >
              <Checkbox
                checked={task.status === "done"}
                onCheckedChange={(checked) =>
                  updateTaskStatus(task.id, checked ? "done" : "todo")
                }
              />
              <span
                className={
                  task.status === "done"
                    ? "flex-1 text-sm text-muted-foreground line-through"
                    : "flex-1 text-sm"
                }
              >
                {task.title}
              </span>
              <PriorityBadge priority={task.priority} />
              <select
                value={task.priority}
                onChange={(e) => updateTaskPriority(task.id, e.target.value as TaskPriority)}
                className="h-6 rounded border border-input bg-transparent px-1 text-xs outline-none"
                aria-label="Priority"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              {task.dueDate && (
                <span className="text-xs text-muted-foreground">
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
              <button
                type="button"
                onClick={() => deleteTask(task.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Delete task"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex items-end gap-2 border-t pt-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Input name="title" placeholder="Add a task…" required />
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
        <Input name="dueDate" type="date" className="w-36" />
        <Button type="submit" size="sm" disabled={pending}>
          Add
        </Button>
      </form>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </div>
  );
}

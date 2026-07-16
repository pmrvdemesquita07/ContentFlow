"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  updateTaskStatus,
  updateTaskPriority,
  updateTaskDueDate,
  deleteTask,
} from "@/app/actions/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import type { TaskPriority } from "@/lib/generated/prisma/enums";

type TaskWithContent = {
  id: string;
  title: string;
  status: string;
  priority: TaskPriority;
  dueDate: Date | null;
  content: { id: string; title: string } | null;
};

export function TaskRow({ task }: { task: TaskWithContent }) {
  const isDone = task.status === "done";

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-start gap-2.5">
        <Checkbox
          checked={isDone}
          // Unchecking sends it straight back to "todo" - the undo for an
          // accidental check is just clicking the same box again.
          onCheckedChange={(checked) => updateTaskStatus(task.id, checked ? "done" : "todo")}
          className="mt-0.5"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={isDone ? "text-sm text-muted-foreground line-through" : "text-sm"}>
            {task.title}
          </span>
          {task.content && (
            <Link
              href="/posts"
              className="w-fit text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {task.content.title}
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={() => deleteTask(task.id)}
          className="shrink-0 text-muted-foreground hover:text-destructive"
          aria-label="Delete task"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-6">
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
        <input
          type="date"
          value={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""}
          onChange={(e) => updateTaskDueDate(task.id, e.target.value)}
          className="h-6 rounded border border-input bg-transparent px-1 text-xs outline-none"
          aria-label="Due date"
        />
      </div>
    </div>
  );
}

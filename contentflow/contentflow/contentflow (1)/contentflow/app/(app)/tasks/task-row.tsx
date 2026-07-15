"use client";

import { updateTaskStatus } from "@/app/actions/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import type { TaskModel } from "@/lib/generated/prisma/models";

export function TaskRow({ task }: { task: TaskModel }) {
  return (
    <div className="flex flex-1 items-center gap-2.5">
      <Checkbox
        checked={task.status === "done"}
        onCheckedChange={(checked) => updateTaskStatus(task.id, checked ? "done" : "todo")}
      />
      <span
        className={
          task.status === "done"
            ? "text-sm text-muted-foreground line-through"
            : "text-sm"
        }
      >
        {task.title}
      </span>
      {task.dueDate && (
        <span className="text-xs text-muted-foreground">
          {new Date(task.dueDate).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}

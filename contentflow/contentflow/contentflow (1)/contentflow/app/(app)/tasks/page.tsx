import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getTasksForWorkspace } from "@/lib/tasks";
import { TaskRow } from "./task-row";

export default async function TasksPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx) return null;

  const tasks = await getTasksForWorkspace(ctx.workspace.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Every task across every piece of content, in one list.
        </p>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tasks yet. Add one from any content item&apos;s Tasks tab.
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 px-4 py-3">
              <TaskRow task={task} />
              <Link
                href={`/posts`}
                className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                {task.content.title}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

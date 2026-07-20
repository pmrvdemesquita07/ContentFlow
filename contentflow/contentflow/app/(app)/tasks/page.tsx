import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getTasksForBrand } from "@/lib/tasks";
import { planAtLeast } from "@/lib/plan";
import { PriorityLegend } from "@/components/tasks/priority-badge";
import { TaskRow } from "./task-row";
import { NewTaskForm } from "./new-task-form";

export default async function TasksPage() {
  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;
  if (!planAtLeast(ctx.workspace.plan, "pro")) redirect("/settings?upgrade=1");

  const tasks = await getTasksForBrand(ctx.brand.id);
  const todoTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Reminders across every piece of content. Check one off and it moves to Check -
            uncheck it to bring it back.
          </p>
        </div>
        <PriorityLegend />
      </div>

      <NewTaskForm />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            To Do <span className="text-xs font-normal">({todoTasks.length})</span>
          </h2>
          {todoTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to do - nice.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {todoTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Check <span className="text-xs font-normal">({doneTasks.length})</span>
          </h2>
          {doneTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing checked off yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {doneTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

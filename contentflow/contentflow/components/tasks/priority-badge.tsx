import { Badge } from "@/components/ui/badge";
import type { TaskPriority } from "@/lib/generated/prisma/enums";

const PRIORITY_CONFIG = {
  low: { label: "Low", variant: "success" as const },
  medium: { label: "Medium", variant: "warning" as const },
  high: { label: "High", variant: "destructive" as const },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = PRIORITY_CONFIG[priority];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function PriorityLegend() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span>Priority:</span>
      {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
        <span key={p} className="flex items-center gap-1">
          <PriorityBadge priority={p} />
        </span>
      ))}
    </div>
  );
}

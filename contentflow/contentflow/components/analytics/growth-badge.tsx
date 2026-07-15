import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs font-medium text-muted-foreground">New</span>;
  }

  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) {
    return <span className="text-xs font-medium text-muted-foreground">0%</span>;
  }

  const isUp = rounded > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isUp ? "text-success" : "text-destructive"
      )}
    >
      {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {isUp ? "+" : ""}
      {rounded}%
    </span>
  );
}

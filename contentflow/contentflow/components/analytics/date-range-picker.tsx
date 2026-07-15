"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DASHBOARD_RANGES, type DashboardRangeKey, type ResolvedRange } from "@/lib/date-range";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DateRangePicker({
  basePath,
  current,
}: {
  basePath: string;
  current: ResolvedRange;
}) {
  const router = useRouter();
  const [showCustom, setShowCustom] = useState(current.key === "custom");
  const [from, setFrom] = useState(() =>
    current.key === "custom" ? current.start.toISOString().slice(0, 10) : ""
  );
  const [to, setTo] = useState(() =>
    current.key === "custom" ? current.end.toISOString().slice(0, 10) : ""
  );

  function applyCustom() {
    if (!from || !to) return;
    router.push(`${basePath}?range=custom&from=${from}&to=${to}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(Object.entries(DASHBOARD_RANGES) as [DashboardRangeKey, { label: string }][]).map(
        ([key, { label }]) => (
          <Link
            key={key}
            href={`${basePath}?range=${key}`}
            onClick={() => setShowCustom(false)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm font-medium",
              current.key === key
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </Link>
        )
      )}
      <button
        type="button"
        onClick={() => setShowCustom((v) => !v)}
        className={cn(
          "rounded-md px-2.5 py-1.5 text-sm font-medium",
          current.key === "custom"
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Custom
      </button>
      {showCustom && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 w-36"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 w-36"
          />
          <Button size="sm" onClick={applyCustom} disabled={!from || !to}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}

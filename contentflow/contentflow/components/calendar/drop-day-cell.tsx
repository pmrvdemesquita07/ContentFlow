"use client";

import { useState } from "react";
import { moveContent } from "@/app/actions/content";
import { moveCalendarEvent } from "@/app/actions/calendar-events";
import { cn } from "@/lib/utils";
import type { DragPayload } from "./draggable-item";

/** Moves the day/month/year to `target` but keeps the item's original time-of-day. */
function retarget(original: Date, target: Date) {
  const next = new Date(original);
  next.setFullYear(target.getFullYear(), target.getMonth(), target.getDate());
  return next;
}

export function DropDayCell({
  date,
  className,
  children,
}: {
  /** The day this cell represents. */
  date: Date;
  className?: string;
  children: React.ReactNode;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!isOver) setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const raw = e.dataTransfer.getData("application/json");
        if (!raw) return;
        const payload = JSON.parse(raw) as DragPayload;
        const nextDate = retarget(new Date(payload.originalDate), date);
        if (payload.kind === "content") {
          void moveContent(payload.id, nextDate);
        } else {
          void moveCalendarEvent(payload.id, nextDate, null);
        }
      }}
      className={cn(className, isOver && "bg-primary/10 ring-1 ring-inset ring-primary/40")}
    >
      {children}
    </div>
  );
}

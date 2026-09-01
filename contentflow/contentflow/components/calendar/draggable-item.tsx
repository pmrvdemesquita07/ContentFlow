"use client";

export type DragPayload = {
  kind: "content" | "event";
  id: string;
  /** Original date, ISO - the drop target keeps this time-of-day, just moves the day. */
  originalDate: string;
};

export function DraggableItem({
  kind,
  id,
  date,
  children,
}: {
  kind: DragPayload["kind"];
  id: string;
  date: Date;
  children: React.ReactNode;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        const payload: DragPayload = { kind, id, originalDate: date.toISOString() };
        e.dataTransfer.setData("application/json", JSON.stringify(payload));
        e.dataTransfer.effectAllowed = "move";
      }}
      className="w-full min-w-0 cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

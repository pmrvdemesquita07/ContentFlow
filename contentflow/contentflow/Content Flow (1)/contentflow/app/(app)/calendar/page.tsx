import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import { getScheduledContent } from "@/lib/content";
import { ContentDetailDialog } from "@/components/content/content-detail-dialog";
import { NewContentDialog } from "@/components/content/new-content-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseMonth(month?: string) {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function monthParam(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParamValue } = await searchParams;
  const { year, month } = parseMonth(monthParamValue);

  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const scheduled = await getScheduledContent(ctx.brand.id);

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const byDay = new Map<number, typeof scheduled>();
  for (const item of scheduled) {
    const d = new Date(item.scheduledAt!);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      byDay.set(day, [...(byDay.get(day) ?? []), item]);
    }
  }

  const prev = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const next = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            {firstOfMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/calendar?month=${monthParam(prev.year, prev.month)}`}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/calendar?month=${monthParam(next.year, next.month)}`}>
              <ChevronRight />
            </Link>
          </Button>
          <NewContentDialog defaultStatus="scheduled" triggerLabel="New post" showScheduledAt />
        </div>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-lg border">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-b bg-muted/40 p-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={cn(
              "flex min-h-28 flex-col gap-1 border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0",
              day === null && "bg-muted/20"
            )}
          >
            {day !== null && (
              <>
                <span className="px-0.5 text-xs text-muted-foreground">{day}</span>
                <div className="flex flex-col gap-1">
                  {(byDay.get(day) ?? []).map((item) => (
                    <ContentDetailDialog key={item.id} content={item}>
                      <div className="w-full truncate rounded bg-accent px-1.5 py-1 text-left text-xs text-accent-foreground">
                        {item.title}
                      </div>
                    </ContentDetailDialog>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCurrentWorkspaceAndBrand } from "@/lib/workspace";
import {
  getCalendarContent,
  getWorkspaceCalendarContent,
  getBestPostingTimes,
} from "@/lib/content";
import {
  getCalendarEvents,
  getWorkspaceCalendarEvents,
  getContractDeadlines,
  getWorkspaceContractDeadlines,
  type ContractDeadline,
} from "@/lib/calendar-events";
import { getCampaignOptions } from "@/lib/campaigns";
import { getCreatorsForWorkspaceOptions, getContractsForWorkspaceOptions } from "@/lib/contracts";
import { planAtLeast } from "@/lib/plan";
import { ContentDetailDialog } from "@/components/content/content-detail-dialog";
import { NewContentDialog } from "@/components/content/new-content-dialog";
import { QuickSchedule } from "@/components/content/quick-schedule";
import { CalendarEventDialog } from "@/components/calendar/calendar-event-dialog";
import { CalendarEventDetailDialog } from "@/components/calendar/calendar-event-detail-dialog";
import { CalendarFilters } from "@/components/calendar/calendar-filters";
import { DraggableItem } from "@/components/calendar/draggable-item";
import { DropDayCell } from "@/components/calendar/drop-day-cell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ContentWithRelations } from "@/lib/types";
import type { SocialPlatform } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const EVENT_STYLES: Record<string, string> = {
  content_approval: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  contract_deadline: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  custom: "bg-muted text-muted-foreground",
};

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

/** The Sunday that starts the week containing `weekParam` (or today, if absent/invalid). */
function parseWeekStart(weekParam?: string) {
  const base = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? new Date(`${weekParam}T00:00:00`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() - base.getDay());
  return start;
}

function weekParamOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatHour(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${period}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type DayChip =
  | { kind: "content"; date: Date; content: ContentWithRelations; brandName?: string }
  | { kind: "event"; date: Date; event: NonNullable<Awaited<ReturnType<typeof getCalendarEvents>>>[number]; brandName?: string }
  | { kind: "deadline"; date: Date; deadline: ContractDeadline };

function buildQuery(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    week?: string;
    view?: string;
    platform?: string;
    creatorId?: string;
    scope?: string;
  }>;
}) {
  const params = await searchParams;
  const view = params.view === "week" ? "week" : "month";
  const { year, month } = parseMonth(params.month);
  const weekStart = parseWeekStart(params.week);
  const platform = (params.platform as SocialPlatform | undefined) || undefined;
  const creatorId = params.creatorId || undefined;

  const user = await requireUser();
  const ctx = await getCurrentWorkspaceAndBrand(user.id);
  if (!ctx?.brand) return null;

  const isStudio = planAtLeast(ctx.workspace.plan, "studio");
  const scope = isStudio && params.scope === "all" ? "all" : "own";

  const [content, events, deadlinesRaw, bestTimes, campaigns, creators, contracts] = await Promise.all([
    scope === "all"
      ? getWorkspaceCalendarContent(ctx.workspace.id, { platform })
      : getCalendarContent(ctx.brand.id, { platform }),
    scope === "all"
      ? getWorkspaceCalendarEvents(ctx.workspace.id, { creatorId })
      : getCalendarEvents(ctx.brand.id, { creatorId }),
    scope === "all" ? getWorkspaceContractDeadlines(ctx.workspace.id) : getContractDeadlines(ctx.brand.id),
    getBestPostingTimes(ctx.brand.id),
    getCampaignOptions(ctx.brand.id),
    getCreatorsForWorkspaceOptions(ctx.workspace.id),
    getContractsForWorkspaceOptions(ctx.workspace.id),
  ]);

  const deadlines = creatorId ? deadlinesRaw.filter((d) => d.creatorId === creatorId) : deadlinesRaw;

  const chips: DayChip[] = [
    ...content.map((c) => ({
      kind: "content" as const,
      date: (c.scheduledAt ?? c.publishedAt)!,
      content: c as ContentWithRelations,
      brandName: "brand" in c ? (c as { brand: { name: string } }).brand.name : undefined,
    })),
    ...events.map((e) => ({
      kind: "event" as const,
      date: e.startAt,
      event: e,
      brandName: "brand" in e ? (e as { brand: { name: string } }).brand.name : undefined,
    })),
    ...deadlines.map((d) => ({ kind: "deadline" as const, date: d.date, deadline: d })),
  ];

  const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  const prevWeek = new Date(weekStart);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const baseParams = { platform, creatorId, scope: scope === "all" ? "all" : undefined };

  const prevHref =
    view === "month"
      ? `/calendar${buildQuery({ ...baseParams, view, month: monthParam(prevMonth.year, prevMonth.month) })}`
      : `/calendar${buildQuery({ ...baseParams, view, week: weekParamOf(prevWeek) })}`;
  const nextHref =
    view === "month"
      ? `/calendar${buildQuery({ ...baseParams, view, month: monthParam(nextMonth.year, nextMonth.month) })}`
      : `/calendar${buildQuery({ ...baseParams, view, week: weekParamOf(nextWeek) })}`;

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const monthCells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  function chipsFor(date: Date) {
    return chips.filter((c) => sameDay(c.date, date));
  }

  function renderChip(chip: DayChip, key: string) {
    if (chip.kind === "content") {
      const label = chip.brandName ? `${chip.brandName}: ${chip.content.title}` : chip.content.title;
      return (
        <DraggableItem key={key} kind="content" id={chip.content.id} date={chip.date}>
          <ContentDetailDialog content={chip.content}>
            <div
              className={cn(
                "w-full truncate rounded px-1.5 py-1 text-left text-xs",
                chip.content.status === "published"
                  ? "bg-success/15 text-success"
                  : "bg-accent text-accent-foreground"
              )}
            >
              {label}
            </div>
          </ContentDetailDialog>
        </DraggableItem>
      );
    }
    if (chip.kind === "event") {
      const label = chip.brandName ? `${chip.brandName}: ${chip.event.title}` : chip.event.title;
      return (
        <DraggableItem key={key} kind="event" id={chip.event.id} date={chip.date}>
          <CalendarEventDetailDialog event={chip.event}>
            <div
              className={cn(
                "w-full truncate rounded px-1.5 py-1 text-left text-xs",
                chip.event.status === "done" ? "opacity-50 line-through" : EVENT_STYLES[chip.event.type]
              )}
            >
              {label}
            </div>
          </CalendarEventDetailDialog>
        </DraggableItem>
      );
    }
    return (
      <Link key={key} href={`/contracts/${chip.deadline.contractId}`} className="block">
        <div className="w-full truncate rounded border border-dashed px-1.5 py-1 text-left text-xs text-muted-foreground">
          {chip.deadline.kind === "start" ? "Starts" : "Due"}: {chip.deadline.title}
        </div>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            {view === "month"
              ? firstOfMonth.toLocaleString(undefined, { month: "long", year: "numeric" })
              : `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
            {scope === "all" && " · All brands"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border p-0.5 text-sm">
            <Link
              href={`/calendar${buildQuery({ ...baseParams, view: "month", month: monthParam(year, month) })}`}
              className={cn("rounded px-2 py-1", view === "month" && "bg-accent text-accent-foreground")}
            >
              Month
            </Link>
            <Link
              href={`/calendar${buildQuery({ ...baseParams, view: "week", week: weekParamOf(weekStart) })}`}
              className={cn("rounded px-2 py-1", view === "week" && "bg-accent text-accent-foreground")}
            >
              Week
            </Link>
          </div>
          <Button variant="outline" size="icon" asChild>
            <Link href={prevHref}>
              <ChevronLeft />
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link href={nextHref}>
              <ChevronRight />
            </Link>
          </Button>
          <CalendarEventDialog campaigns={campaigns} creators={creators} contracts={contracts} />
          <NewContentDialog defaultStatus="scheduled" triggerLabel="New post" showScheduledAt />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CalendarFilters creators={creators} />
        {isStudio && (
          <div className="flex items-center rounded-md border p-0.5 text-sm">
            <Link
              href={`/calendar${buildQuery({ view, platform, creatorId, month: view === "month" ? monthParam(year, month) : undefined, week: view === "week" ? weekParamOf(weekStart) : undefined })}`}
              className={cn("rounded px-2 py-1", scope === "own" && "bg-accent text-accent-foreground")}
            >
              This brand
            </Link>
            <Link
              href={`/calendar${buildQuery({ view, platform, creatorId, scope: "all", month: view === "month" ? monthParam(year, month) : undefined, week: view === "week" ? weekParamOf(weekStart) : undefined })}`}
              className={cn("rounded px-2 py-1", scope === "all" && "bg-accent text-accent-foreground")}
            >
              All brands
            </Link>
          </div>
        )}
      </div>

      <QuickSchedule />

      {bestTimes && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <Sparkles className="size-4 shrink-0 text-primary" />
            <p className="text-sm">
              Based on your last {bestTimes.sampleSize} published posts, engagement has been
              highest on <span className="font-semibold">{WEEKDAY_NAMES[bestTimes.bestDay.day]}</span>{" "}
              (avg {Math.round(bestTimes.bestDay.avg).toLocaleString()} interactions) around{" "}
              <span className="font-semibold">{formatHour(bestTimes.bestHour.hour)}</span> (avg{" "}
              {Math.round(bestTimes.bestHour.avg).toLocaleString()} interactions). Worth
              scheduling your next post around then.
            </p>
          </CardContent>
        </Card>
      )}

      {view === "month" ? (
        <div className="grid grid-cols-7 overflow-hidden rounded-lg border">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="border-b bg-muted/40 p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {monthCells.map((day, i) => {
            const date = day !== null ? new Date(year, month, day) : null;
            return (
              <DropDayCell
                key={i}
                date={date ?? new Date(year, month, 1)}
                className={cn(
                  "flex min-h-28 min-w-0 flex-col gap-1 border-b border-r p-1.5 [&:nth-child(7n)]:border-r-0",
                  day === null && "bg-muted/20"
                )}
              >
                {day !== null && (
                  <>
                    <span className="px-0.5 text-xs text-muted-foreground">{day}</span>
                    <div className="flex min-w-0 flex-col gap-1">
                      {chipsFor(date!).map((chip, idx) => renderChip(chip, `${i}-${idx}`))}
                    </div>
                  </>
                )}
              </DropDayCell>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-7 overflow-hidden rounded-lg border">
          {weekDays.map((d) => (
            <div
              key={d.toISOString()}
              className="border-b bg-muted/40 p-2 text-center text-xs font-medium text-muted-foreground"
            >
              {WEEKDAYS[d.getDay()]} {d.getDate()}
            </div>
          ))}
          {weekDays.map((d, i) => (
            <DropDayCell
              key={i}
              date={d}
              className="flex min-h-64 min-w-0 flex-col gap-1 border-r p-1.5 [&:nth-child(7n)]:border-r-0"
            >
              <div className="flex min-w-0 flex-col gap-1">
                {chipsFor(d).map((chip, idx) => renderChip(chip, `${i}-${idx}`))}
              </div>
            </DropDayCell>
          ))}
        </div>
      )}
    </div>
  );
}

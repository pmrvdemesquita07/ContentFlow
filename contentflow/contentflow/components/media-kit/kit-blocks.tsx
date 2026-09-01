import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/* The media kit is a document, not an app screen: every block here is a
   print-first primitive - flat borders, generous padding, no hover states -
   so the exported PDF reads like the media kits brands already receive. */

export function KitHeader({
  name,
  handle,
  meta,
  tags,
  avatarUrl,
  score,
  rangeLabel,
  compact = false,
  className,
}: {
  name: string;
  handle: string | null;
  meta: string | null;
  tags: string[];
  avatarUrl: string | null;
  score: number;
  rangeLabel: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex items-stretch gap-3">
        <div className="w-[3px] shrink-0 rounded-full bg-[var(--chart-1)]" />
        <div className="relative shrink-0">
          <Avatar className={cn("rounded-lg border", compact ? "size-11" : "size-[72px]")}>
            <AvatarImage src={avatarUrl ?? undefined} alt="" className="object-cover" />
            <AvatarFallback className="rounded-lg text-sm">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute -bottom-1.5 -left-1.5 rounded-md bg-success px-1.5 py-0.5 font-semibold text-success-foreground",
              compact ? "text-[10px]" : "text-xs"
            )}
          >
            {score}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className={cn("font-semibold", compact ? "text-sm" : "text-lg")}>{name}</span>
            {handle && (
              <span className="text-xs text-[var(--chart-1)]">@{handle}</span>
            )}
          </div>
          {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--chart-1)] px-2 py-0.5 text-[11px] text-[var(--chart-1)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <Logo size="sm" />
        <span className="text-xs text-muted-foreground">{rangeLabel}</span>
      </div>
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {eyebrow && <span className="text-lg font-semibold">{eyebrow}</span>}
      <h2 className={cn("text-2xl", eyebrow ? "font-normal" : "font-semibold")}>{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  footValue,
  footLabel,
}: {
  label: string;
  value: string;
  delta?: string | null;
  deltaTone?: "up" | "down" | "neutral";
  footValue?: string | null;
  footLabel?: string;
}) {
  return (
    <div className="flex break-inside-avoid flex-col gap-3 rounded-xl border p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xl font-semibold">{value}</span>
        {delta && (
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-xs font-medium",
              deltaTone === "down" && "bg-destructive text-destructive-foreground",
              deltaTone === "up" && "bg-success text-success-foreground",
              deltaTone === "neutral" && "bg-muted text-[var(--chart-1)]"
            )}
          >
            {delta}
          </span>
        )}
      </div>
      {(footValue || footLabel) && (
        <div className="flex flex-col">
          {footValue && (
            <span className={cn("text-sm", deltaTone === "down" ? "text-destructive" : "")}>
              {footValue}
            </span>
          )}
          {footLabel && <span className="text-xs text-muted-foreground">{footLabel}</span>}
        </div>
      )}
    </div>
  );
}

/** The wide card the reference uses to group values that only make sense
 * side by side (total impressions / total engagement / virality rate). */
export function MetricGroupCard({
  label,
  items,
}: {
  label: string;
  items: { value: string; caption: string }[];
}) {
  return (
    <div className="flex break-inside-avoid flex-col gap-4 rounded-xl border p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.caption} className="flex flex-col">
            <span className="text-2xl font-semibold">{item.value}</span>
            <span className="text-sm text-muted-foreground">{item.caption}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarList({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string; percent: number }[];
}) {
  const max = Math.max(...items.map((i) => i.percent), 1);
  return (
    <div className="flex break-inside-avoid flex-col gap-4 rounded-xl border p-5">
      <span className="text-sm text-muted-foreground">{title}</span>
      <div className="flex flex-col gap-3.5">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm">{item.label}</span>
              <span className="shrink-0 text-sm font-medium tabular-nums">{item.value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[var(--chart-1)] opacity-60"
                style={{ width: `${Math.max(2, (item.percent / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal age bars. The platform APIs report age and gender as two
 * separate breakdowns (never crossed), so this charts age on its own rather
 * than inventing an age-by-gender split. */
export function AgeBars({ items }: { items: { label: string; percent: number }[] }) {
  const max = Math.max(...items.map((i) => i.percent), 1);
  return (
    <div className="flex break-inside-avoid flex-col gap-4 rounded-xl border p-5">
      <span className="text-sm text-muted-foreground">Followers by age</span>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-xs text-muted-foreground">{item.label}</span>
            <div className="h-4 flex-1 overflow-hidden rounded-sm bg-muted">
              <div
                className="h-full rounded-sm bg-[var(--chart-1)] opacity-60"
                style={{ width: `${Math.max(1, (item.percent / max) * 100)}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs tabular-nums">
              {item.percent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Donut split by gender, with the percentages spelled out underneath the way
 * the reference kits do - the ring alone is hard to read off a printed page. */
export function GenderDonut({ items }: { items: { label: string; percent: number }[] }) {
  const size = 132;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const colors = ["var(--chart-3)", "var(--chart-1)", "var(--chart-axis)"];

  const arcs = items.map((item, i) => {
    const precedingPercent = items.slice(0, i).reduce((sum, p) => sum + p.percent, 0);
    return {
      ...item,
      length: (item.percent / 100) * circumference,
      offset: (precedingPercent / 100) * circumference,
      color: colors[i % colors.length],
    };
  });

  return (
    <div className="flex break-inside-avoid flex-col items-center gap-4 rounded-xl border p-5">
      <span className="w-full text-sm text-muted-foreground">Followers by gender</span>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        {arcs.map((arc) => (
          <circle
            key={arc.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeDasharray={`${arc.length} ${circumference - arc.length}`}
            strokeDashoffset={-arc.offset}
          />
        ))}
      </svg>
      <div className="flex w-full flex-wrap justify-center gap-x-6 gap-y-2">
        {arcs.map((arc) => (
          <div key={arc.label} className="flex flex-col items-center">
            <span className="text-lg font-semibold" style={{ color: arc.color }}>
              {arc.percent.toFixed(2)}%
            </span>
            <span className="text-xs text-muted-foreground">{arc.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScoreRing({
  score,
  components,
}: {
  score: number;
  components: { label: string; percent: number }[];
}) {
  const size = 200;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;

  return (
    <div className="grid break-inside-avoid gap-8 rounded-xl border p-6 sm:grid-cols-2 sm:items-center">
      <div className="flex justify-center">
        <div className="relative">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--success)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference - filled}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-semibold">{score}</span>
            <span className="text-xs text-muted-foreground">of 100</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        {components.map((c) => (
          <div key={c.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm">{c.label}</span>
              <span className="text-sm font-medium tabular-nums">{Math.round(c.percent)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${Math.max(1, c.percent)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PostRow({
  thumbnailUrl,
  title,
  publishedAt,
  likes,
  comments,
  saves,
  engagement,
  hashtags,
  mentions,
  reach,
  impressions,
}: {
  thumbnailUrl: string | null;
  title: string;
  publishedAt: Date | null;
  likes: number;
  comments: number;
  saves: number;
  engagement: number;
  hashtags: number;
  mentions: number;
  reach: number;
  impressions: number;
}) {
  const stats = [
    { label: "Engagement", value: engagement },
    { label: "Nº hashtags", value: hashtags },
    { label: "Mentions", value: mentions },
    { label: "Reach", value: reach },
    { label: "Impressions", value: impressions },
  ];

  return (
    <div className="flex break-inside-avoid gap-4 rounded-xl border p-3">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          className="size-24 shrink-0 rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <div className="size-24 shrink-0 rounded-lg bg-muted" />
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-1">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Likes / comments / saves</span>
            <span className="text-sm font-medium tabular-nums">
              {likes.toLocaleString()} · {comments.toLocaleString()} · {saves.toLocaleString()}
            </span>
          </div>
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <span className="text-sm font-medium tabular-nums">
                {stat.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="truncate text-sm">{title}</span>
          {publishedAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(publishedAt).toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

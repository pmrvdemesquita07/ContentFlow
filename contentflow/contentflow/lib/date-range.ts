// Pure date-range resolution, kept dependency-free (no Prisma import) so
// client components (like the range picker) can import it without pulling
// server-only code into the browser bundle.

export const DASHBOARD_RANGES = {
  "7d": { label: "7 days", days: 7 },
  "30d": { label: "30 days", days: 30 },
  "90d": { label: "90 days", days: 90 },
  "1y": { label: "1 year", days: 365 },
} as const;

export type DashboardRangeKey = keyof typeof DASHBOARD_RANGES;

export type ResolvedRange = {
  start: Date;
  end: Date;
  label: string;
  key: DashboardRangeKey | "custom";
};

function parseDateParam(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Resolves range-related search params into a concrete start/end window -
 * either one of the fixed presets ending "now", or an explicit custom
 * from/to (whole days, inclusive). Falls back to the 30-day preset for
 * anything malformed rather than erroring on a bad query string.
 */
export function resolveDateRange(params: {
  range?: string;
  from?: string;
  to?: string;
}): ResolvedRange {
  if (params.range === "custom") {
    const from = parseDateParam(params.from);
    const to = parseDateParam(params.to);
    if (from && to && from <= to) {
      const end = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1);
      return { start: from, end, label: `${params.from} to ${params.to}`, key: "custom" };
    }
  }
  const key: DashboardRangeKey =
    params.range && params.range in DASHBOARD_RANGES ? (params.range as DashboardRangeKey) : "30d";
  const preset = DASHBOARD_RANGES[key];
  const end = new Date();
  const start = new Date(end.getTime() - preset.days * 24 * 60 * 60 * 1000);
  return { start, end, label: preset.label, key };
}

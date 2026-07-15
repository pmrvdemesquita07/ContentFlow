type BarChartItem = {
  label: string;
  value: number;
};

/**
 * Single-series horizontal bar chart. One hue, no legend needed (a single
 * series doesn't need color-matching - the title already says what's plotted).
 * See the dataviz skill: thin bars, rounded data-end, direct end labels.
 */
export function BarChart({
  items,
  valueFormatter = (v: number) => v.toLocaleString(),
}: {
  items: BarChartItem[];
  valueFormatter?: (value: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-xs text-muted-foreground" title={item.label}>
            {item.label}
          </span>
          <div
            className="h-5 flex-1 overflow-hidden rounded-sm"
            style={{ backgroundColor: "var(--chart-grid)" }}
          >
            <div
              className="h-full rounded-r-sm"
              style={{
                width: `${Math.max(2, (item.value / max) * 100)}%`,
                backgroundColor: "var(--chart-1)",
              }}
              title={valueFormatter(item.value)}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums">
            {valueFormatter(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

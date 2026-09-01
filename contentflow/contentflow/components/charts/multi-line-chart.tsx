type Series = {
  key: string;
  label: string;
  points: { label: string; value: number }[];
  /** CSS var name (e.g. "--chart-1") to keep this series' color consistent
   * with the same platform's color elsewhere on the page. Falls back to
   * cycling through the palette by index. */
  colorVar?: string;
};

export const CHART_COLOR_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"];
const COLOR_VARS = CHART_COLOR_VARS;

/**
 * Multiple series over the same time axis (e.g. follower count per
 * platform), sharing one y-scale so the lines stay comparable. Mirrors
 * LineChart's tightened y-range and SVG approach - only added complexity is
 * the extra series and the legend.
 */
export function MultiLineChart({ series }: { series: Series[] }) {
  const nonEmpty = series.filter((s) => s.points.length > 0);

  if (nonEmpty.length === 0) {
    return <p className="text-sm text-muted-foreground">Not enough data yet.</p>;
  }

  const maxPoints = Math.max(...nonEmpty.map((s) => s.points.length));
  if (maxPoints === 1) {
    return (
      <div className="flex flex-wrap gap-4">
        {nonEmpty.map((s, i) => (
          <div key={s.key} className="flex items-baseline gap-2">
            <span
              className="size-2 rounded-full"
              style={{ background: `var(${s.colorVar ?? COLOR_VARS[i % COLOR_VARS.length]})` }}
            />
            <span className="text-sm font-medium">{s.label}</span>
            <span className="text-sm text-muted-foreground">
              {s.points[0].value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const paddingX = 8;
  const paddingTop = 16;
  const paddingBottom = 12;

  const allValues = nonEmpty.flatMap((s) => s.points.map((p) => p.value));
  const max = Math.max(...allValues);
  const min = Math.min(...allValues);
  const range = max - min || Math.max(1, max * 0.1);
  const yMax = max + range * 0.15;
  const yMin = Math.max(0, min - range * 0.15);

  const labels = nonEmpty.reduce(
    (longest, s) => (s.points.length > longest.length ? s.points.map((p) => p.label) : longest),
    [] as string[]
  );
  const stepX = (width - paddingX * 2) / Math.max(1, labels.length - 1);

  const seriesCoords = nonEmpty.map((s, i) => {
    const color = `var(${s.colorVar ?? COLOR_VARS[i % COLOR_VARS.length]})`;
    const coords = s.points.map((p) => {
      const idx = labels.indexOf(p.label);
      return {
        x: paddingX + (idx === -1 ? 0 : idx) * stepX,
        y:
          height -
          paddingBottom -
          ((p.value - yMin) / (yMax - yMin || 1)) * (height - paddingTop - paddingBottom),
        ...p,
      };
    });
    const path = coords.map((c, i2) => `${i2 === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
    return { key: s.key, label: s.label, color, coords, path };
  });

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
        <line
          x1={paddingX}
          y1={height - paddingBottom}
          x2={width - paddingX}
          y2={height - paddingBottom}
          stroke="var(--chart-axis)"
          strokeWidth={1}
        />
        {seriesCoords.map((s) => (
          <path
            key={s.key}
            d={s.path}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {seriesCoords.map((s) =>
          s.coords.map((c, i) => (
            <circle key={`${s.key}-${i}`} cx={c.x} cy={c.y} r={3} fill={s.color}>
              <title>{`${s.label} - ${c.label}: ${c.value.toLocaleString()}`}</title>
            </circle>
          ))
        )}
      </svg>
      <div className="flex flex-wrap gap-4">
        {seriesCoords.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs">
            <span className="size-2 rounded-full" style={{ background: s.color }} />
            <span className="font-medium">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{labels[0]}</span>
        <span>
          Range: {min.toLocaleString()} - {max.toLocaleString()}
        </span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

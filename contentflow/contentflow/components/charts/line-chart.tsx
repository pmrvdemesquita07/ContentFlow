type LineChartPoint = {
  label: string;
  value: number;
};

/**
 * Single-series line chart over time. Uses a tightened y-range (not
 * zero-based) so real trends stay visible - min/max are labeled on the
 * axis so the scale is never hidden, per the dataviz honesty rule.
 */
export function LineChart({
  points,
  valueFormatter = (v: number) => v.toLocaleString(),
}: {
  points: LineChartPoint[];
  valueFormatter?: (value: number) => string;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">Not enough data yet.</p>;
  }

  if (points.length === 1) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{valueFormatter(points[0].value)}</span>
        <span className="text-xs text-muted-foreground">as of {points[0].label}</span>
      </div>
    );
  }

  const width = 600;
  const height = 160;
  const paddingX = 8;
  const paddingTop = 20;
  const paddingBottom = 12;

  const values = points.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || Math.max(1, max * 0.1);
  const yMax = max + range * 0.15;
  const yMin = min - range * 0.15;
  const stepX = (width - paddingX * 2) / (points.length - 1);

  const coords = points.map((p, i) => ({
    x: paddingX + i * stepX,
    y:
      height -
      paddingBottom -
      ((p.value - yMin) / (yMax - yMin || 1)) * (height - paddingTop - paddingBottom),
    ...p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - paddingBottom} L ${coords[0].x} ${height - paddingBottom} Z`;

  return (
    <div className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
        <line
          x1={paddingX}
          y1={height - paddingBottom}
          x2={width - paddingX}
          y2={height - paddingBottom}
          stroke="var(--chart-axis)"
          strokeWidth={1}
        />
        <path d={areaPath} fill="var(--chart-1)" opacity={0.1} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={4} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2}>
            <title>{`${c.label}: ${valueFormatter(c.value)}`}</title>
          </circle>
        ))}
        <text
          x={coords[coords.length - 1].x}
          y={Math.max(12, coords[coords.length - 1].y - 10)}
          textAnchor="end"
          fontSize={12}
          fontWeight={600}
          fill="var(--foreground)"
        >
          {valueFormatter(coords[coords.length - 1].value)}
        </text>
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{points[0].label}</span>
        <span>
          Range: {valueFormatter(min)} - {valueFormatter(max)}
        </span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}

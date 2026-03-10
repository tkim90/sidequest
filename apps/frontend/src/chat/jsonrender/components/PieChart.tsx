import {
  chartFillStyles,
  FillSwatch,
  surfaceClass,
  titleClass,
} from "../theme";

interface PieChartProps {
  title?: string;
  data: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
}

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 75;

export default function PieChart({ title, data, nameKey, valueKey }: PieChartProps) {
  if (!data || data.length === 0) return null;

  const values = data.map((d) => Math.max(0, Number(d[valueKey]) || 0));
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const slices: { startAngle: number; endAngle: number; color: string; name: string; pct: number }[] = [];
  let cumAngle = -Math.PI / 2;

  values.forEach((val, i) => {
    const angle = (val / total) * Math.PI * 2;
    const fillStyle = chartFillStyles[i % chartFillStyles.length];
    slices.push({
      startAngle: cumAngle,
      endAngle: cumAngle + angle,
      color: fillStyle.fill,
      name: String(data[i][nameKey]),
      pct: (val / total) * 100,
    });
    cumAngle += angle;
  });

  return (
    <div className={`${surfaceClass} p-4`}>
      {title && <p className={`mb-3 ${titleClass}`}>{title}</p>}
      <div className="flex items-center gap-4">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-40 w-40 shrink-0">
          {slices.map((s, i) => {
            const largeArc = s.endAngle - s.startAngle > Math.PI ? 1 : 0;
            const x1 = CX + R * Math.cos(s.startAngle);
            const y1 = CY + R * Math.sin(s.startAngle);
            const x2 = CX + R * Math.cos(s.endAngle);
            const y2 = CY + R * Math.sin(s.endAngle);
            const d = `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            const fillStyle = chartFillStyles[i % chartFillStyles.length];
            return (
              <path
                key={i}
                d={d}
                fill={fillStyle.fill}
                stroke={fillStyle.stroke}
                strokeWidth={fillStyle.strokeWidth ?? 1.5}
              />
            );
          })}
        </svg>
        <div className="flex flex-col gap-1.5">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <FillSwatch style={chartFillStyles[i % chartFillStyles.length]} />
              <span className="text-xs text-muted-foreground">
                {s.name} <span className="text-foreground">({s.pct.toFixed(0)}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

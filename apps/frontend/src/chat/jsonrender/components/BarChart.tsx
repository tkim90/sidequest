import {
  chartAxisLabelColor,
  chartFillStyles,
  chartGridColor,
  surfaceClass,
  titleClass,
} from "../theme";

interface BarChartProps {
  title?: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
}

const CHART_H = 200;
const CHART_W = 400;
const PAD = { top: 20, right: 20, bottom: 40, left: 60 };

export default function BarChart({ title, data, xKey, yKey }: BarChartProps) {
  if (!data || data.length === 0) return null;

  const values = data.map((d) => Number(d[yKey]) || 0);
  const maxVal = Math.max(...values, 1);
  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const barW = Math.max(4, plotW / data.length - 8);

  return (
    <div className={`${surfaceClass} p-4`}>
      {title && <p className={`mb-3 ${titleClass}`}>{title}</p>}
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Y-axis gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD.top + plotH * (1 - t);
          return (
            <g key={t}>
              <line
                x1={PAD.left}
                y1={y}
                x2={CHART_W - PAD.right}
                y2={y}
                stroke={chartGridColor}
                strokeWidth="0.75"
                strokeDasharray="3 4"
              />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fill={chartAxisLabelColor} fontSize="8">
                {formatNumber(maxVal * t)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const val = Number(d[yKey]) || 0;
          const x = PAD.left + (plotW / data.length) * i + (plotW / data.length - barW) / 2;
          const h = (val / maxVal) * plotH;
          const y = PAD.top + plotH - h;
          const barStyle = chartFillStyles[i % chartFillStyles.length];
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx="2"
                fill={barStyle.fill}
                stroke={barStyle.stroke}
                strokeWidth={barStyle.strokeWidth ?? 1.5}
              />
              <text
                x={PAD.left + (plotW / data.length) * (i + 0.5)}
                y={CHART_H - PAD.bottom + 14}
                textAnchor="middle"
                fill={chartAxisLabelColor}
                fontSize="8"
              >
                {String(d[xKey])}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

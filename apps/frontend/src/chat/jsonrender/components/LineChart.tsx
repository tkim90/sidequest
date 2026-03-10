import {
  LineSwatch,
  chartAxisLabelColor,
  chartDotFillColor,
  chartGridColor,
  chartLineStyles,
  surfaceClass,
  titleClass,
} from "../theme";

interface LineChartProps {
  title?: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
}

const CHART_H = 200;
const CHART_W = 400;
const PAD = { top: 20, right: 20, bottom: 40, left: 60 };

export default function LineChart({ title, data, xKey, yKeys }: LineChartProps) {
  if (!data || data.length === 0 || !yKeys || yKeys.length === 0) return null;

  const allValues = data.flatMap((d) => yKeys.map((k) => Number(d[k]) || 0));
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;

  function toX(i: number) {
    return PAD.left + (i / Math.max(data.length - 1, 1)) * plotW;
  }

  function toY(val: number) {
    return PAD.top + plotH - ((val - minVal) / range) * plotH;
  }

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
                {formatNumber(minVal + range * t)}
              </text>
            </g>
          );
        })}

        {/* Lines */}
        {yKeys.map((key, ki) => {
          const points = data.map((d, i) => `${toX(i)},${toY(Number(d[key]) || 0)}`).join(" ");
          const lineStyle = chartLineStyles[ki % chartLineStyles.length];
          return (
            <polyline
              key={key}
              points={points}
              fill="none"
              stroke={lineStyle.stroke}
              strokeWidth="2"
              strokeDasharray={lineStyle.strokeDasharray}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {/* Dots */}
        {yKeys.map((key, ki) =>
          data.map((d, i) => (
            <circle
              key={`${key}-${i}`}
              cx={toX(i)}
              cy={toY(Number(d[key]) || 0)}
              r="2.5"
              fill={chartDotFillColor}
              stroke={chartLineStyles[ki % chartLineStyles.length].stroke}
              strokeWidth="1.5"
            />
          )),
        )}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={toX(i)}
            y={CHART_H - PAD.bottom + 14}
            textAnchor="middle"
            fill={chartAxisLabelColor}
            fontSize="8"
          >
            {String(d[xKey])}
          </text>
        ))}
      </svg>

      {/* Legend */}
      {yKeys.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {yKeys.map((key, ki) => (
            <div key={key} className="flex items-center gap-1.5">
              <LineSwatch style={chartLineStyles[ki % chartLineStyles.length]} />
              <span className="text-xs text-muted-foreground">{key}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

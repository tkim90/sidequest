export const surfaceClass = "rounded-xl border border-border bg-card text-card-foreground shadow-sm";
export const insetSurfaceClass = "rounded-lg border border-border bg-secondary text-secondary-foreground";
export const titleClass = "text-sm font-semibold text-foreground";
export const bodyTextClass = "text-sm leading-relaxed text-foreground";
export const captionTextClass = "text-xs leading-relaxed text-muted-foreground";
export const labelTextClass = "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground";
export const secondaryButtonClass =
  "rounded-md border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-default disabled:border-border disabled:bg-muted disabled:text-muted-foreground";
export const primaryButtonClass =
  "rounded-md border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-default disabled:border-border disabled:bg-muted disabled:text-muted-foreground";
export const outlineButtonClass =
  "rounded-md border border-border bg-transparent px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-default disabled:border-border disabled:bg-muted disabled:text-muted-foreground";
export const destructiveButtonClass =
  "rounded-md border border-destructive bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/80 disabled:cursor-default disabled:border-border disabled:bg-muted disabled:text-muted-foreground";

export interface ChartFillStyle {
  fill: string;
  stroke: string;
  strokeWidth?: number;
}

export interface ChartLineStyle {
  stroke: string;
  strokeDasharray?: string;
}

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export const chartGridColor = "var(--border)";
export const chartAxisLabelColor = "var(--muted-foreground)";
export const chartDotFillColor = "var(--card)";

export const chartFillStyles: ChartFillStyle[] = chartColors.map((color) => ({
  fill: color,
  stroke: color,
}));

export const chartLineStyles: ChartLineStyle[] = [
  { stroke: chartColors[0] },
  { stroke: chartColors[1], strokeDasharray: "8 4" },
  { stroke: chartColors[2], strokeDasharray: "2 3" },
  { stroke: chartColors[3], strokeDasharray: "10 3 2 3" },
  { stroke: chartColors[4], strokeDasharray: "12 4 2 4 2 4" },
];

export function FillSwatch({ style }: { style: ChartFillStyle }) {
  return (
    <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="12"
        height="12"
        rx="3"
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth ?? 1.5}
      />
    </svg>
  );
}

export function LineSwatch({ style }: { style: ChartLineStyle }) {
  return (
    <svg viewBox="0 0 24 8" className="h-2 w-6 shrink-0" aria-hidden="true">
      <line
        x1="1"
        y1="4"
        x2="23"
        y2="4"
        stroke={style.stroke}
        strokeWidth="2"
        strokeDasharray={style.strokeDasharray}
        strokeLinecap="round"
      />
    </svg>
  );
}

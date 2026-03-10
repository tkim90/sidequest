import { captionTextClass, surfaceClass } from "../theme";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
}

const trendColors: Record<string, string> = {
  up: "text-success",
  down: "text-destructive",
  neutral: "text-muted-foreground",
};

export default function MetricCard({ label, value, change, trend = "neutral" }: MetricCardProps) {
  return (
    <div className={`${surfaceClass} p-4`}>
      <p className={captionTextClass}>{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {change && (
        <p className={`mt-1 text-xs font-medium ${trendColors[trend] ?? trendColors.neutral}`}>
          {trend === "up" && "\u2191 "}
          {trend === "down" && "\u2193 "}
          {change}
        </p>
      )}
    </div>
  );
}

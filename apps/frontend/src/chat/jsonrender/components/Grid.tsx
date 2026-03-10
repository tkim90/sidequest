import type { ReactNode } from "react";

interface GridProps {
  columns?: number;
  gap?: string;
  children?: ReactNode;
}

export default function Grid({ columns = 2, gap = "1rem", children }: GridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap,
      }}
    >
      {children}
    </div>
  );
}

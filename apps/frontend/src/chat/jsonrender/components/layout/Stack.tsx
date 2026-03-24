import type { ReactNode } from "react";

interface StackProps {
  direction?: "horizontal" | "vertical";
  gap?: string;
  children?: ReactNode;
}

export default function Stack({ direction = "vertical", gap = "0.75rem", children }: StackProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction === "horizontal" ? "row" : "column",
        gap,
      }}
    >
      {children}
    </div>
  );
}

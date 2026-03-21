import type { CSSProperties, ReactNode } from "react";

export const PAPER_SURFACE_OPACITY = {
  soft: 0.14,
  default: 0.18,
  strong: 0.22,
} as const;

type PaperSurfaceIntensity = keyof typeof PAPER_SURFACE_OPACITY;

interface PaperSurfaceProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  intensity?: PaperSurfaceIntensity;
}

function PaperSurface({
  children,
  className,
  contentClassName,
  intensity = "default",
}: PaperSurfaceProps) {
  const style = {
    "--paper-texture-opacity": PAPER_SURFACE_OPACITY[intensity],
  } as CSSProperties;

  return (
    <div
      className={["paper-surface relative overflow-hidden", className].filter(Boolean).join(" ")}
      data-paper-surface="true"
      style={style}
    >
      <div
        className={[
          "paper-surface__content relative z-[1] min-w-0",
          contentClassName,
        ].filter(Boolean).join(" ")}
        data-paper-surface-content="true"
      >
        {children}
      </div>
    </div>
  );
}

export type { PaperSurfaceIntensity };
export default PaperSurface;

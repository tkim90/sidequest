interface SplitPaneDividerProps {
  isResizing: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}

function SplitPaneDivider({
  isResizing,
  onPointerDown,
}: SplitPaneDividerProps) {
  return (
    <div
      aria-hidden
      className="relative z-20 hidden h-full touch-none cursor-col-resize lg:block"
      onPointerDown={onPointerDown}
    >
      <div
        className={[
          "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors duration-200",
          isResizing ? "bg-foreground/35" : "bg-border/90",
        ].join(" ")}
      />
      <div
        className={[
          "absolute inset-y-0 left-1/2 w-4 -translate-x-1/2 rounded-full transition-colors duration-200",
          isResizing ? "bg-paper-raised/80" : "hover:bg-paper-raised/55",
        ].join(" ")}
      />
    </div>
  );
}

export default SplitPaneDivider;

const BINDER_MARKS = [
  "circle",
  "capsule",
  "capsule",
  "circle",
  "capsule",
  "capsule",
  "circle",
] as const;

interface NotebookBinderMarksProps {
  gutterWidthPx: number;
}

function NotebookBinderMarks({ gutterWidthPx }: NotebookBinderMarksProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 z-20 flex flex-col justify-between py-8"
      style={{ width: `${gutterWidthPx}px` }}
    >
      {BINDER_MARKS.map((mark, index) => (
        <span
          key={`${mark}-${index}`}
          className={[
            "mx-auto block bg-paper-gutter shadow-[inset_0_1px_0_rgb(255_255_255_/_0.34)]",
            mark === "circle"
              ? "h-4 w-4 rounded-full"
              : "h-8 w-4 rounded-full",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

export { BINDER_MARKS };
export default NotebookBinderMarks;

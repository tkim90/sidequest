import type { BranchFocus } from "../../types";

interface ChatWindowHeaderProps {
  branchFocus: BranchFocus | null;
  isFixedPane?: boolean;
  onClose: () => void;
  showCloseButton?: boolean;
  title: string;
}

function ChatWindowHeader({
  branchFocus,
  isFixedPane = false,
  onClose,
  showCloseButton = true,
  title,
}: ChatWindowHeaderProps) {
  return (
    <header
      className={[
        "relative z-10 flex justify-between gap-3",
        isFixedPane
          ? "bg-transparent px-1 pb-6 pt-1"
          : "bg-transparent px-4 pb-2 pt-3",
      ].join(" ")}
    >
      <div className="min-w-0">
        <h2
          className={[
            "tracking-tight text-foreground",
            isFixedPane
              ? "font-serif text-3xl sm:text-4xl"
              : "font-serif text-[22px] leading-tight",
          ].join(" ")}
        >
          {title}
        </h2>
        {branchFocus ? (
          <p
            className={[
              "max-w-xl text-muted-foreground",
              isFixedPane
                ? "mt-3 text-base leading-6 italic"
                : "mt-1 text-[13px] leading-5 italic",
            ].join(" ")}
          >
            Focus: "{branchFocus.selectedText}"
          </p>
        ) : null}
      </div>
      {showCloseButton ? (
        <button
          className={[
            "inline-flex h-8 w-8 shrink-0 items-center justify-center self-start text-sm font-medium text-foreground transition-colors",
            isFixedPane
              ? "rounded-sm border border-border bg-paper-sheet hover:bg-card"
              : "rounded-full bg-transparent hover:bg-paper-raised/60",
          ].join(" ")}
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
        >
          X
        </button>
      ) : null}
    </header>
  );
}

export default ChatWindowHeader;

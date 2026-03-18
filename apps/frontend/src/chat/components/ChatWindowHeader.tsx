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
  const titleClassName = isFixedPane
    ? "font-serif text-3xl tracking-tight text-foreground sm:text-4xl"
    : "font-serif text-[42px] leading-tight tracking-tight text-foreground";

  const focusClassName = isFixedPane
    ? "mt-3 max-w-xl text-base leading-6 text-muted-foreground italic"
    : "mt-2 max-w-xl text-[24px] leading-[1.35] text-muted-foreground italic";

  const closeButtonClassName = isFixedPane
    ? "cursor-pointer inline-flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-sm border border-border bg-paper-sheet text-sm font-medium text-foreground transition-colors hover:bg-card"
    : "cursor-pointer inline-flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-full bg-transparent text-[20px] font-medium text-foreground transition-colors hover:bg-paper-raised/60";

  return (
    <header className="relative z-10 flex justify-between gap-3 bg-transparent px-4 pb-3 pt-4">
      <div className="min-w-0">
        <h2 className={titleClassName}>{title}</h2>
        {branchFocus ? (
          <p className={focusClassName}>
            Focus: "{branchFocus.selectedText}"
          </p>
        ) : null}
      </div>
      {showCloseButton ? (
        <button
          className={closeButtonClassName}
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
        >
          <span style={{ fontFamily: "system-ui, sans-serif" }}>X</span>
        </button>
      ) : null}
    </header>
  );
}

export default ChatWindowHeader;

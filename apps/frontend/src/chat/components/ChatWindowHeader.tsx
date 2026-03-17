import type { BranchFocus } from "../../types";
import { secondaryButtonClassName } from "./ui";

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
        "flex justify-between gap-4 border-b border-border",
        isFixedPane
          ? "bg-transparent px-1 pb-6 pt-1"
          : "bg-secondary px-5 py-4",
      ].join(" ")}
    >
      <div>
        <h2
          className={[
            "tracking-tight text-foreground",
            isFixedPane ? "font-serif text-3xl sm:text-4xl" : "text-2xl font-medium",
          ].join(" ")}
        >
          {title}
        </h2>
        {branchFocus ? (
          <p
            className={[
              "mt-3 max-w-xl leading-6 text-muted-foreground",
              isFixedPane ? "text-base italic" : "text-sm",
            ].join(" ")}
          >
            Focus: "{branchFocus.selectedText}"
          </p>
        ) : null}
      </div>
      {showCloseButton ? (
        <button
          className={`${secondaryButtonClassName} shrink-0 self-start`}
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

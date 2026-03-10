import type { BranchFocus } from "../../types";
import { secondaryButtonClassName } from "./ui";

interface ChatWindowHeaderProps {
  branchFocus: BranchFocus | null;
  onClose: () => void;
  title: string;
}

function ChatWindowHeader({
  branchFocus,
  onClose,
  title,
}: ChatWindowHeaderProps) {
  return (
    <header className="flex justify-between gap-4 border-b border-border bg-secondary px-5 py-4">
      <div>
        <h2 className="text-2xl font-medium tracking-tight text-foreground">
          {title}
        </h2>
        {branchFocus ? (
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Focus: "{branchFocus.selectedText}"
          </p>
        ) : null}
      </div>
      <button
        className={`${secondaryButtonClassName} shrink-0 self-start`}
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onClose}
      >
        X
      </button>
    </header>
  );
}

export default ChatWindowHeader;

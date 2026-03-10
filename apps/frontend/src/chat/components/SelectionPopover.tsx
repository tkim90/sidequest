import { useState, type RefObject } from "react";

import type { SelectionState } from "../../types";

interface SelectionPopoverProps {
  onBranch: (prompt?: string) => void;
  popoverRef: RefObject<HTMLDivElement | null>;
  selectionState: SelectionState;
}

function SelectionPopover({
  onBranch,
  popoverRef,
  selectionState,
}: SelectionPopoverProps) {
  const [inputValue, setInputValue] = useState("");

  function handleSubmit() {
    if (inputValue.trim()) {
      onBranch(inputValue.trim());
    } else {
      onBranch();
    }
  }

  return (
    <div
      className="fixed z-40 flex min-w-[420px] -translate-x-1/2 -translate-y-full flex-col gap-2 border border-popover-foreground/30 bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg"
      ref={popoverRef}
      style={{
        left: selectionState.x,
        top: selectionState.y,
      }}
    >
      <p className="m-0">Sidebar this selection into a new chat?</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg border border-border bg-secondary transition-colors focus-within:border-ring">
          <input
            autoFocus
            type="text"
            className="w-full bg-transparent px-3 py-1 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Sidebar this conversation..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
        </div>
        <button
          className="inline-flex shrink-0 self-stretch cursor-pointer items-center justify-center rounded-lg border border-primary bg-primary px-2 py-1.5 text-xs font-semibold uppercase text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          type="button"
          onClick={handleSubmit}
        >
          New Chat
        </button>
      </div>
    </div>
  );
}

export default SelectionPopover;

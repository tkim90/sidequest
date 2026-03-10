import type { RefObject } from "react";

import type { SelectionState } from "../../types";

interface SelectionPopoverProps {
  onBranch: () => void;
  popoverRef: RefObject<HTMLDivElement | null>;
  selectionState: SelectionState;
}

function SelectionPopover({
  onBranch,
  popoverRef,
  selectionState,
}: SelectionPopoverProps) {
  return (
    <div
      className="fixed z-40 flex -translate-x-1/2 -translate-y-full items-center gap-3 border border-zinc-950 bg-zinc-950 px-4 py-3 text-sm text-zinc-50"
      ref={popoverRef}
      style={{
        left: selectionState.x,
        top: selectionState.y,
      }}
    >
      <p className="m-0">Sidebar this selection into a new chat?</p>
      <button
        className="inline-flex cursor-pointer items-center justify-center border border-zinc-50 bg-white px-2 py-2 text-xs font-semibold uppercase text-zinc-950 transition-colors hover:bg-zinc-100"
        type="button"
        onClick={onBranch}
      >
        New Chat
      </button>
    </div>
  );
}

export default SelectionPopover;

import type { RefObject } from "react";

import type { SelectionState } from "../../types";
import { primaryButtonClassName } from "./ui";

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
      className="fixed z-40 flex -translate-x-1/2 items-center gap-3 border border-zinc-950 bg-zinc-950 px-4 py-3 text-sm text-zinc-50 shadow-[8px_8px_0_0_rgba(24,24,27,0.2)]"
      ref={popoverRef}
      style={{
        left: selectionState.x,
        top: selectionState.y,
      }}
    >
      <p className="m-0">Branch this phrase into a new chat?</p>
      <button
        className={`${primaryButtonClassName} border-zinc-50 bg-zinc-50 text-zinc-950 hover:bg-zinc-200`}
        type="button"
        onClick={onBranch}
      >
        Branch
      </button>
    </div>
  );
}

export default SelectionPopover;

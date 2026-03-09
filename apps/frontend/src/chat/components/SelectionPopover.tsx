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
      className="selection-popover"
      ref={popoverRef}
      style={{
        left: selectionState.x,
        top: selectionState.y,
      }}
    >
      <p>Branch this phrase into a new chat?</p>
      <button className="send-button" type="button" onClick={onBranch}>
        Branch
      </button>
    </div>
  );
}

export default SelectionPopover;

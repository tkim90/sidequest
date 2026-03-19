import { useLayoutEffect, useState, type RefObject } from "react";

import type { SelectionState } from "../../types";

const POPOVER_VIEWPORT_MARGIN_PX = 16;
const POPOVER_ANCHOR_GAP_PX = 12;

interface SelectionPopoverPosition {
  left: number;
  top: number;
}

function clamp(value: number, min: number, max: number): number {
  if (max <= min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export function resolveSelectionPopoverPosition(options: {
  anchorX: number;
  anchorY: number;
  popoverHeight: number;
  popoverWidth: number;
  viewportHeight: number;
  viewportWidth: number;
}): SelectionPopoverPosition {
  const {
    anchorX,
    anchorY,
    popoverHeight,
    popoverWidth,
    viewportHeight,
    viewportWidth,
  } = options;

  const left = clamp(
    anchorX - popoverWidth / 2,
    POPOVER_VIEWPORT_MARGIN_PX,
    viewportWidth - POPOVER_VIEWPORT_MARGIN_PX - popoverWidth,
  );
  const maxTop = viewportHeight - POPOVER_VIEWPORT_MARGIN_PX - popoverHeight;
  const preferredTop = anchorY - popoverHeight - POPOVER_ANCHOR_GAP_PX;
  const fallbackTop = anchorY + POPOVER_ANCHOR_GAP_PX;
  const top = clamp(
    preferredTop >= POPOVER_VIEWPORT_MARGIN_PX ? preferredTop : fallbackTop,
    POPOVER_VIEWPORT_MARGIN_PX,
    maxTop,
  );

  return { left, top };
}

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
  const [position, setPosition] = useState<SelectionPopoverPosition | null>(null);

  function handleSubmit() {
    if (inputValue.trim()) {
      onBranch(inputValue.trim());
    } else {
      onBranch();
    }
  }

  useLayoutEffect(() => {
    function updatePosition(): void {
      const node = popoverRef.current;
      if (!node) {
        return;
      }

      const rect = node.getBoundingClientRect();
      setPosition(
        resolveSelectionPopoverPosition({
          anchorX: selectionState.x,
          anchorY: selectionState.y,
          popoverHeight: rect.height,
          popoverWidth: rect.width,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        }),
      );
    }

    setPosition(null);
    updatePosition();
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, [popoverRef, selectionState]);

  return (
    <div
      className="fixed z-40 flex min-w-[420px] flex-col gap-2 border border-popover-foreground/30 bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg"
      ref={popoverRef}
      style={{
        left: position?.left ?? selectionState.x,
        top: position?.top ?? selectionState.y,
        visibility: position ? "visible" : "hidden",
      }}
    >
      <p className="m-0">Sidebar this selection into a new chat?</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-2xl border border-border bg-secondary transition-colors">
          <input
            autoFocus
            type="text"
            className="w-full px-3 py-1 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Ask a new question..."
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

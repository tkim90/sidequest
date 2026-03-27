import {
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";

import type { SelectionState } from "../../../types";
import { Button } from "../../../components/ui/button";

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

export function getSelectionIdentityKey(selectionState: SelectionState): string {
  return `${selectionState.parentWindowId}:${selectionState.parentMessageId}:${selectionState.selectedText}`;
}

interface BranchCtaButtonProps {
  onExpand: () => void;
}

function BranchCtaButton({ onExpand }: BranchCtaButtonProps) {
  return (
    <button
      className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-neutral-800"
      type="button"
      onClick={onExpand}
    >
      Branch in new window
    </button>
  );
}

interface VisualizeCtaButtonProps {
  onVisualize: () => void;
}

function VisualizeCtaButton({ onVisualize }: VisualizeCtaButtonProps) {
  return (
    <button
      className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-border bg-paper-window px-4 py-2 text-sm font-medium text-foreground shadow-lg transition-colors hover:bg-paper-raised"
      type="button"
      onClick={onVisualize}
    >
      Visualize
    </button>
  );
}

interface SelectionComposeFormProps {
  copy: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (prompt?: string) => void;
}

function SelectionComposeForm({
  copy,
  placeholder,
  submitLabel,
  onSubmit,
}: SelectionComposeFormProps) {
  const [inputValue, setInputValue] = useState("");

  function handleSubmit() {
    const prompt = inputValue.trim();
    if (prompt) {
      onSubmit(prompt);
    } else {
      onSubmit();
    }
  }

  return (
    <>
      <p className="m-0">{copy}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-2xl border border-border bg-secondary transition-colors">
          <input
            autoFocus
            type="text"
            className="w-full px-3 py-1 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
            placeholder={placeholder}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmit();
              }
            }}
          />
        </div>
        <Button
          className="shrink-0 self-stretch rounded-lg px-2 py-1.5"
          type="button"
          size="sm"
          onClick={handleSubmit}
        >
          {submitLabel}
        </Button>
      </div>
    </>
  );
}

interface SelectionPopoverProps {
  onBranchExpand: () => void;
  onBranchSubmit: (prompt?: string) => void;
  onVisualizeExpand: () => void;
  onVisualizeSubmit: (prompt?: string) => void;
  popoverRef: RefObject<HTMLDivElement | null>;
  selectionState: SelectionState;
}

function SelectionPopover({
  onBranchExpand,
  onBranchSubmit,
  onVisualizeExpand,
  onVisualizeSubmit,
  popoverRef,
  selectionState,
}: SelectionPopoverProps) {
  const [position, setPosition] = useState<SelectionPopoverPosition | null>(null);

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

  const isComposeStage =
    selectionState.stage === "branch-compose" ||
    selectionState.stage === "visualize-compose";

  return (
    <div
      className={
        isComposeStage
          ? "fixed z-[60] flex min-w-[420px] flex-col gap-2 border border-popover-foreground/30 bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg"
          : "fixed z-[60] flex items-center gap-2 rounded-[22px] border border-popover-foreground/20 bg-popover px-3 py-3 text-sm text-popover-foreground shadow-lg"
      }
      ref={popoverRef}
      style={{
        left: position?.left ?? selectionState.x,
        top: position?.top ?? selectionState.y,
        visibility: position ? "visible" : "hidden",
      }}
    >
      {selectionState.stage === "branch-compose" ? (
        <SelectionComposeForm
          copy="Sidebar this selection into a new chat?"
          placeholder="Ask a follow-up question..."
          submitLabel="New Chat"
          onSubmit={onBranchSubmit}
        />
      ) : selectionState.stage === "visualize-compose" ? (
        <SelectionComposeForm
          copy="What should this visualization focus on?"
          placeholder="Describe what to visualize..."
          submitLabel="Visualize"
          onSubmit={onVisualizeSubmit}
        />
      ) : (
        <>
          <BranchCtaButton onExpand={onBranchExpand} />
          <VisualizeCtaButton onVisualize={onVisualizeExpand} />
        </>
      )}
    </div>
  );
}

export default SelectionPopover;
export {
  BranchCtaButton,
  SelectionComposeForm,
  VisualizeCtaButton,
};

import {
  useMemo,
  type CSSProperties,
} from "react";

import type { BranchFocus } from "../../../types";
import { Button } from "../../../components/ui/button";
import { FLOATING_ROOT_WINDOW_WIDTH } from "../../lib/constants";
import BranchFocusButton from "./BranchFocusButton";
import CloseIcon from "../shared/CloseIcon";

const TITLE_CHARACTER_ANIMATION_DURATION_MS = 2200;
const TITLE_CHARACTER_ANIMATION_STAGGER_MS = 100;
const TITLE_CHARACTER_ANIMATION_EASING = "cubic-bezier(0.16, 1, 0.1, 1)";
const FOCUS_TOOLTIP_GAP_PX = 14;
const FOCUS_TOOLTIP_VIEWPORT_MARGIN_PX = 16;
const FLOATING_HEADER_HORIZONTAL_PADDING_PX = 32;
const FLOATING_HEADER_CLOSE_BUTTON_WIDTH_PX = 40;
const FLOATING_HEADER_GAP_PX = 12;
const TITLE_CHARACTER_ANIMATION_NAME = "chat-window-title-reveal";

interface AnimatedTitleUnit {
  character: string;
  isSpace: boolean;
  key: string;
  visibleIndex: number | null;
}

interface AnimatedTitleTextProps {
  className: string;
  title: string;
}

interface FocusTooltipPosition {
  left: number;
  top: number;
}

export function getAnimatedTitleUnits(title: string): AnimatedTitleUnit[] {
  let visibleIndex = 0;

  return Array.from(title).map((character, index) => {
    if (character === " ") {
      return {
        character,
        isSpace: true,
        key: `space-${index}`,
        visibleIndex: null,
      };
    }

    const unit = {
      character,
      isSpace: false,
      key: `char-${index}-${character}`,
      visibleIndex,
    };
    visibleIndex += 1;
    return unit;
  });
}

export function resolveFocusTooltipPosition(options: {
  pointerX: number;
  pointerY: number;
  tooltipHeight: number;
  tooltipWidth: number;
  viewportHeight: number;
  viewportWidth: number;
}): FocusTooltipPosition {
  const {
    pointerX,
    pointerY,
    tooltipHeight,
    tooltipWidth,
    viewportHeight,
    viewportWidth,
  } = options;

  const maxLeft = Math.max(
    FOCUS_TOOLTIP_VIEWPORT_MARGIN_PX,
    viewportWidth - FOCUS_TOOLTIP_VIEWPORT_MARGIN_PX - tooltipWidth,
  );
  const maxTop = Math.max(
    FOCUS_TOOLTIP_VIEWPORT_MARGIN_PX,
    viewportHeight - FOCUS_TOOLTIP_VIEWPORT_MARGIN_PX - tooltipHeight,
  );

  return {
    left: Math.min(
      Math.max(
        FOCUS_TOOLTIP_VIEWPORT_MARGIN_PX,
        pointerX - tooltipWidth / 2,
      ),
      maxLeft,
    ),
    top: Math.min(
      Math.max(
        FOCUS_TOOLTIP_VIEWPORT_MARGIN_PX,
        pointerY - tooltipHeight - FOCUS_TOOLTIP_GAP_PX,
      ),
      maxTop,
    ),
  };
}

function AnimatedTitleText({ className, title }: AnimatedTitleTextProps) {
  const units = useMemo(() => getAnimatedTitleUnits(title), [title]);

  return (
    <h2
      aria-label={title}
      className={className}
      data-animated-title="true"
    >
      <style>{`
@keyframes ${TITLE_CHARACTER_ANIMATION_NAME} {
  from {
    filter: blur(8px);
    opacity: 0;
    transform: translateY(0.18em);
  }

  to {
    filter: blur(0px);
    opacity: 1;
    transform: translateY(0);
  }
}
`}</style>
      {units.map((unit) => {
        if (unit.isSpace) {
          return (
            <span
              key={unit.key}
              aria-hidden="true"
              style={{ display: "inline-block", whiteSpace: "pre" }}
            >
              {" "}
            </span>
          );
        }

        const style: CSSProperties = {
          animationDelay: `${(unit.visibleIndex ?? 0) * TITLE_CHARACTER_ANIMATION_STAGGER_MS}ms`,
          animationDuration: `${TITLE_CHARACTER_ANIMATION_DURATION_MS}ms`,
          animationFillMode: "forwards",
          animationName: TITLE_CHARACTER_ANIMATION_NAME,
          animationTimingFunction: TITLE_CHARACTER_ANIMATION_EASING,
          display: "inline-block",
          filter: "blur(8px)",
          opacity: 0,
          transform: "translateY(0.18em)",
          willChange: "opacity, transform, filter",
        };

        return (
          <span
            key={unit.key}
            aria-hidden="true"
            data-animated-title-char="true"
            style={style}
          >
            {unit.character}
          </span>
        );
      })}
    </h2>
  );
}

interface ChatWindowHeaderProps {
  alwaysShowCloseButton?: boolean;
  branchAnchorId?: string | null;
  branchFocus: BranchFocus | null;
  isFixedPane?: boolean;
  onMobileDragPointerDown?: React.ComponentProps<"header">["onPointerDown"];
  onNavigateToBranchSource?: () => void;
  onClose: () => void;
  showCloseButton?: boolean;
  title: string;
}

function ChatWindowHeader({
  alwaysShowCloseButton = false,
  branchAnchorId = null,
  branchFocus,
  isFixedPane = false,
  onMobileDragPointerDown,
  onNavigateToBranchSource,
  onClose,
  showCloseButton = true,
  title,
}: ChatWindowHeaderProps) {
  const titleClassName = isFixedPane
    ? "font-serif text-3xl tracking-tight text-foreground sm:text-4xl"
    : "font-serif text-[24px] leading-tight tracking-tight text-foreground";

  const focusClassName = isFixedPane
    ? "mt-3 text-base leading-6 text-muted-foreground italic"
    : "mt-2 text-[16px] leading-[1.35] text-muted-foreground italic";
  const focusButtonClassName = [
    focusClassName,
    "block w-full min-w-0 cursor-pointer text-left transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none",
  ].join(" ");
  const focusLabel = branchFocus ? branchFocus.selectedText : null;
  const floatingHeaderContentMaxWidth =
    FLOATING_ROOT_WINDOW_WIDTH -
    FLOATING_HEADER_HORIZONTAL_PADDING_PX -
    (showCloseButton
      ? FLOATING_HEADER_CLOSE_BUTTON_WIDTH_PX + FLOATING_HEADER_GAP_PX
      : 0);
  const headerContentStyle = isFixedPane
    ? undefined
    : { maxWidth: `${floatingHeaderContentMaxWidth}px` };

  const closeButtonClassName = [
    "h-10 w-10 shrink-0 self-start rounded-full bg-transparent text-foreground transition-[opacity,background-color] duration-200 hover:bg-paper-raised/60",
    alwaysShowCloseButton
      ? "pointer-events-auto opacity-100"
      : "opacity-0 group-hover/chat-window:pointer-events-auto group-hover/chat-window:opacity-100",
  ].join(" ");

  function handleFocusClick(): void {
    if (!branchAnchorId || !onNavigateToBranchSource) {
      return;
    }

    onNavigateToBranchSource();
  }

  return (
    <header
      className="relative z-30 flex justify-between gap-3 bg-transparent px-4 pb-3 pt-4"
      data-mobile-card-header="true"
      onPointerDown={onMobileDragPointerDown}
    >
      <div
        className="flex-1 min-w-0 overflow-hidden"
        style={headerContentStyle}
      >
        {isFixedPane ? (
          <AnimatedTitleText
            key={title}
            className={titleClassName}
            title={title}
          />
        ) : (
          <h2 className={titleClassName}>{title}</h2>
        )}
        {branchFocus && focusLabel ? (
          <BranchFocusButton
            className={focusButtonClassName}
            label={focusLabel}
            onClick={handleFocusClick}
          />
        ) : null}
      </div>
      {showCloseButton ? (
        <Button
          aria-label="Close note"
          className={closeButtonClassName}
          variant="ghost"
          size="icon"
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
        >
          <CloseIcon />
        </Button>
      ) : null}
    </header>
  );
}

export default ChatWindowHeader;

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

import type { BranchFocus } from "../../types";

const TITLE_CHARACTER_ANIMATION_DURATION_MS = 2200;
const TITLE_CHARACTER_ANIMATION_STAGGER_MS = 100;
const TITLE_CHARACTER_ANIMATION_EASING = "cubic-bezier(0.16, 1, 0.1, 1)";
const FOCUS_TOOLTIP_GAP_PX = 14;
const FOCUS_TOOLTIP_VIEWPORT_MARGIN_PX = 16;

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

interface TooltipPointerPosition {
  x: number;
  y: number;
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
  const [isSettled, setIsSettled] = useState(false);
  const units = useMemo(() => getAnimatedTitleUnits(title), [title]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsSettled(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <h2
      aria-label={title}
      className={className}
      data-animated-title="true"
    >
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
          display: "inline-block",
          filter: isSettled ? "blur(0px)" : "blur(8px)",
          opacity: isSettled ? 1 : 0,
          transform: isSettled ? "translateY(0)" : "translateY(0.18em)",
          transitionDelay: `${(unit.visibleIndex ?? 0) * TITLE_CHARACTER_ANIMATION_STAGGER_MS}ms`,
          transitionDuration: `${TITLE_CHARACTER_ANIMATION_DURATION_MS}ms`,
          transitionProperty: "opacity, transform, filter",
          transitionTimingFunction: TITLE_CHARACTER_ANIMATION_EASING,
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
  branchAnchorId?: string | null;
  branchFocus: BranchFocus | null;
  isFixedPane?: boolean;
  onNavigateToBranchSource?: () => void;
  onClose: () => void;
  showCloseButton?: boolean;
  title: string;
}

function ChatWindowHeader({
  branchAnchorId = null,
  branchFocus,
  isFixedPane = false,
  onNavigateToBranchSource,
  onClose,
  showCloseButton = true,
  title,
}: ChatWindowHeaderProps) {
  const [isFocusTooltipVisible, setIsFocusTooltipVisible] = useState(false);
  const [focusTooltipPosition, setFocusTooltipPosition] =
    useState<FocusTooltipPosition | null>(null);
  const [tooltipPointerPosition, setTooltipPointerPosition] =
    useState<TooltipPointerPosition | null>(null);
  const focusTooltipRef = useRef<HTMLDivElement | null>(null);

  const titleClassName = isFixedPane
    ? "font-serif text-3xl tracking-tight text-foreground sm:text-4xl"
    : "font-serif text-[24px] leading-tight tracking-tight text-foreground";

  const focusClassName = isFixedPane
    ? "mt-3 max-w-xl text-base leading-6 text-muted-foreground italic"
    : "mt-2 max-w-xl text-[16px] leading-[1.35] text-muted-foreground italic";
  const focusButtonClassName = [
    focusClassName,
    "block w-full min-w-0 cursor-pointer text-left transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none",
  ].join(" ");
  const focusTextClassName = "block overflow-hidden text-ellipsis whitespace-nowrap";
  const focusTooltipClassName =
    "pointer-events-none fixed z-[120] max-w-[min(32rem,calc(100vw-32px))] whitespace-normal break-words rounded-xl border border-border bg-popover px-3 py-2 text-sm leading-5 text-popover-foreground not-italic shadow-lg";
  const focusLabel = branchFocus
    ? branchFocus.selectedText
    : null;
  const navigateToBranchSource = onNavigateToBranchSource;

  function handleFocusClick(): void {
    if (!branchAnchorId || !navigateToBranchSource) {
      return;
    }

    navigateToBranchSource();
  }

  function hideFocusTooltip(): void {
    setIsFocusTooltipVisible(false);
    setFocusTooltipPosition(null);
  }

  function handleFocusTooltipPointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    setTooltipPointerPosition({
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handleFocusTooltipPointerEnter(
    event: ReactPointerEvent<HTMLButtonElement>,
  ): void {
    setTooltipPointerPosition({
      x: event.clientX,
      y: event.clientY,
    });
    setIsFocusTooltipVisible(true);
  }

  function handleFocusTooltipFocus(
    event: ReactFocusEvent<HTMLButtonElement>,
  ): void {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPointerPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setIsFocusTooltipVisible(true);
  }

  useLayoutEffect(() => {
    if (
      !isFocusTooltipVisible ||
      !tooltipPointerPosition ||
      !focusTooltipRef.current
    ) {
      return;
    }

    const rect = focusTooltipRef.current.getBoundingClientRect();
    setFocusTooltipPosition(
      resolveFocusTooltipPosition({
        pointerX: tooltipPointerPosition.x,
        pointerY: tooltipPointerPosition.y,
        tooltipHeight: rect.height,
        tooltipWidth: rect.width,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      }),
    );
  }, [isFocusTooltipVisible, tooltipPointerPosition, focusLabel]);

  useEffect(() => {
    if (!isFocusTooltipVisible) {
      return;
    }

    function handleWindowResize(): void {
      if (!tooltipPointerPosition) {
        return;
      }

      const node = focusTooltipRef.current;
      if (!node) {
        return;
      }

      const rect = node.getBoundingClientRect();
      setFocusTooltipPosition(
        resolveFocusTooltipPosition({
          pointerX: tooltipPointerPosition.x,
          pointerY: tooltipPointerPosition.y,
          tooltipHeight: rect.height,
          tooltipWidth: rect.width,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        }),
      );
    }

    window.addEventListener("resize", handleWindowResize);
    return () => {
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [isFocusTooltipVisible, tooltipPointerPosition]);

  const closeButtonClassName =
    "cursor-pointer inline-flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-full bg-transparent text-foreground opacity-0 transition-[opacity,background-color] duration-200 group-hover/chat-window:pointer-events-auto group-hover/chat-window:opacity-100 hover:bg-paper-raised/60";

  const focusTooltip =
    branchFocus &&
    focusLabel &&
    isFocusTooltipVisible &&
    typeof document !== "undefined"
      ? createPortal(
          <div
            aria-hidden="true"
            className={focusTooltipClassName}
            data-focus-tooltip="true"
            ref={focusTooltipRef}
            style={{
              left:
                focusTooltipPosition?.left ??
                tooltipPointerPosition?.x ??
                FOCUS_TOOLTIP_VIEWPORT_MARGIN_PX,
              top:
                focusTooltipPosition?.top ??
                tooltipPointerPosition?.y ??
                FOCUS_TOOLTIP_VIEWPORT_MARGIN_PX,
              visibility: focusTooltipPosition ? "visible" : "hidden",
            }}
          >
            {focusLabel}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <header className="relative z-30 flex justify-between gap-3 bg-transparent px-4 pb-3 pt-4 max-w-[400px]">
        <div className="min-w-0">
          {isFixedPane ? (
            <AnimatedTitleText
              key={title}
              className={titleClassName}
              title={title}
            />
          ) : (
            <h2 className={titleClassName}>{title}</h2>
          )}
          {branchFocus ? (
            <button
              aria-label={focusLabel ?? undefined}
              className={focusButtonClassName}
              type="button"
              onBlur={hideFocusTooltip}
              onClick={handleFocusClick}
              onFocus={handleFocusTooltipFocus}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerEnter={handleFocusTooltipPointerEnter}
              onPointerLeave={hideFocusTooltip}
              onPointerMove={handleFocusTooltipPointerMove}
            >
              <span className={focusTextClassName}>{focusLabel}</span>
            </button>
          ) : null}
        </div>
        {showCloseButton ? (
          <button
            aria-label="Close note"
            className={closeButtonClassName}
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onClose}
          >
            <svg
              aria-hidden
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
            >
              <path
                d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        ) : null}
      </header>
      {focusTooltip}
    </>
  );
}

export default ChatWindowHeader;

import {
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

import { useMountEffect } from "../../../hooks/useMountEffect";
import { resolveFocusTooltipPosition } from "./ChatWindowHeader";

const FOCUS_TOOLTIP_SHOW_DELAY_MS = 550;
const FOCUS_TOOLTIP_FADE_DURATION_MS = 180;
const FOCUS_TOOLTIP_VIEWPORT_MARGIN_PX = 16;

interface TooltipPointerPosition {
  x: number;
  y: number;
}

interface FocusTooltipPosition {
  left: number;
  top: number;
}

const focusTooltipClassName =
  "pointer-events-none fixed z-[120] max-w-[min(32rem,calc(100vw-32px))] whitespace-normal break-words rounded-xl border border-border bg-popover px-3 py-2 text-sm leading-5 text-popover-foreground not-italic shadow-lg";
const focusTooltipTransition = `opacity ${FOCUS_TOOLTIP_FADE_DURATION_MS}ms ease, transform ${FOCUS_TOOLTIP_FADE_DURATION_MS}ms ease`;
const focusTextClassName = "block overflow-hidden text-ellipsis whitespace-nowrap";

interface BranchFocusButtonProps {
  className: string;
  label: string;
  onClick: () => void;
}

/**
 * A truncated branch-focus label button with an on-hover tooltip portal that
 * shows the full text. Owns its own tooltip show/hide lifecycle so the parent
 * header stays simple.
 */
function BranchFocusButton({
  className,
  label,
  onClick,
}: BranchFocusButtonProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [position, setPosition] = useState<FocusTooltipPosition | null>(null);
  const [pointerPosition, setPointerPosition] =
    useState<TooltipPointerPosition | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const isMountedRef = useRef(isMounted);
  const pointerPositionRef = useRef(pointerPosition);
  isMountedRef.current = isMounted;
  pointerPositionRef.current = pointerPosition;

  function clearShowTimeout(): void {
    if (showTimeoutRef.current === null) return;
    window.clearTimeout(showTimeoutRef.current);
    showTimeoutRef.current = null;
  }

  function clearHideTimeout(): void {
    if (hideTimeoutRef.current === null) return;
    window.clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = null;
  }

  function queueTooltip(pos: TooltipPointerPosition): void {
    setPointerPosition(pos);
    setPosition(null);
    setIsMounted(true);
    setIsExiting(false);
    clearHideTimeout();
    clearShowTimeout();
    showTimeoutRef.current = window.setTimeout(() => {
      setIsActive(true);
      showTimeoutRef.current = null;
    }, FOCUS_TOOLTIP_SHOW_DELAY_MS);
  }

  function hideTooltip(): void {
    clearShowTimeout();
    clearHideTimeout();
    setIsExiting(true);
    setIsActive(false);
    hideTimeoutRef.current = window.setTimeout(() => {
      setIsMounted(false);
      setIsExiting(false);
      setPosition(null);
      setPointerPosition(null);
      hideTimeoutRef.current = null;
    }, FOCUS_TOOLTIP_FADE_DURATION_MS);
  }

  function handlePointerEnter(event: ReactPointerEvent<HTMLButtonElement>): void {
    queueTooltip({ x: event.clientX, y: event.clientY });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>): void {
    setPointerPosition({ x: event.clientX, y: event.clientY });
  }

  function handleFocus(event: ReactFocusEvent<HTMLButtonElement>): void {
    const rect = event.currentTarget.getBoundingClientRect();
    queueTooltip({ x: rect.left + rect.width / 2, y: rect.top });
  }

  // Position the tooltip using layout measurement.
  useLayoutEffect(() => {
    if (!isMounted || !pointerPosition || !tooltipRef.current) {
      return;
    }

    const rect = tooltipRef.current.getBoundingClientRect();
    setPosition(
      resolveFocusTooltipPosition({
        pointerX: pointerPosition.x,
        pointerY: pointerPosition.y,
        tooltipHeight: rect.height,
        tooltipWidth: rect.width,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      }),
    );
  }, [isMounted, pointerPosition, label]);

  // Re-resolve position on window resize.
  useMountEffect(() => {
    function handleWindowResize(): void {
      if (!isMountedRef.current) return;

      const pointer = pointerPositionRef.current;
      if (!pointer) return;
      const node = tooltipRef.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      setPosition(
        resolveFocusTooltipPosition({
          pointerX: pointer.x,
          pointerY: pointer.y,
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
  });

  // Clean up timers on unmount.
  useMountEffect(() => {
    return () => {
      clearShowTimeout();
      clearHideTimeout();
    };
  });

  const tooltip =
    isMounted && typeof document !== "undefined"
      ? createPortal(
          <div
            aria-hidden="true"
            className={focusTooltipClassName}
            data-focus-tooltip="true"
            ref={tooltipRef}
            style={{
              left:
                position?.left ??
                pointerPosition?.x ??
                FOCUS_TOOLTIP_VIEWPORT_MARGIN_PX,
              top:
                position?.top ??
                pointerPosition?.y ??
                FOCUS_TOOLTIP_VIEWPORT_MARGIN_PX,
              opacity: isActive ? 1 : 0,
              transform:
                isActive || isExiting
                  ? "translateY(0)"
                  : "translateY(6px)",
              transition: focusTooltipTransition,
              visibility: position ? "visible" : "hidden",
              willChange: "opacity, transform",
            }}
          >
            {label}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        aria-label={label}
        className={className}
        type="button"
        onBlur={hideTooltip}
        onClick={onClick}
        onFocus={handleFocus}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={hideTooltip}
        onPointerMove={handlePointerMove}
      >
        <span className={focusTextClassName}>{label}</span>
      </button>
      {tooltip}
    </>
  );
}

export default BranchFocusButton;

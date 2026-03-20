import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import type { BranchFocus } from "../../types";

const TITLE_CHARACTER_ANIMATION_DURATION_MS = 2200;
const TITLE_CHARACTER_ANIMATION_STAGGER_MS = 100;
const TITLE_CHARACTER_ANIMATION_EASING = "cubic-bezier(0.16, 1, 0.1, 1)";

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
  const titleClassName = isFixedPane
    ? "font-serif text-3xl tracking-tight text-foreground sm:text-4xl"
    : "font-serif text-[24px] leading-tight tracking-tight text-foreground";

  const focusClassName = isFixedPane
    ? "mt-3 max-w-xl text-base leading-6 text-muted-foreground italic"
    : "mt-2 max-w-xl text-[16px] leading-[1.35] text-muted-foreground italic";
  const focusButtonClassName = [
    focusClassName,
    "group/focus-summary relative block w-full min-w-0 cursor-pointer text-left transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none",
  ].join(" ");
  const focusTextClassName = "block overflow-hidden text-ellipsis whitespace-nowrap";
  const focusPopoverClassName = [
    "pointer-events-none invisible absolute left-0 top-full z-20 mt-2 w-max max-w-[22rem] max-h-40 overflow-auto rounded-xl border border-border bg-popover px-3 py-2 text-sm leading-5 text-popover-foreground not-italic opacity-0 shadow-lg transition-[opacity,visibility] duration-150",
    "group-hover/focus-summary:visible group-hover/focus-summary:opacity-100",
    "group-focus-within/focus-summary:visible group-focus-within/focus-summary:opacity-100",
  ].join(" ");
  const focusLabel = branchFocus
    ? `Focus: "${branchFocus.selectedText}"`
    : null;
  const navigateToBranchSource = onNavigateToBranchSource;

  function handleFocusClick(): void {
    if (!branchAnchorId || !navigateToBranchSource) {
      return;
    }

    navigateToBranchSource();
  }

  const closeButtonClassName =
    "cursor-pointer inline-flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-full bg-transparent text-foreground opacity-0 transition-[opacity,background-color] duration-200 group-hover/chat-window:pointer-events-auto group-hover/chat-window:opacity-100 hover:bg-paper-raised/60";

  return (
    <header className="relative z-10 flex justify-between gap-3 bg-transparent px-4 pb-3 pt-4">
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
            onClick={handleFocusClick}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span className={focusTextClassName}>{focusLabel}</span>
            <span
              aria-hidden="true"
              className={focusPopoverClassName}
            >
              {focusLabel}
            </span>
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
  );
}

export default ChatWindowHeader;

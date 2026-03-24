import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export const DISCLOSURE_CONTENT_ANIMATION_DURATION_MS = 260;
export const DISCLOSURE_CONTENT_ANIMATION_EASING =
  "cubic-bezier(0.16, 1, 0.3, 1)";

export function getDisclosureContentShellStyle(
  isExpanded: boolean,
  measuredHeight: number,
): CSSProperties {
  return {
    height: isExpanded ? measuredHeight : 0,
    marginTop: isExpanded ? 16 : 0,
    opacity: isExpanded ? 1 : 0,
    overflow: "hidden",
    pointerEvents: isExpanded ? "auto" : "none",
    transitionDuration: `${DISCLOSURE_CONTENT_ANIMATION_DURATION_MS}ms`,
    transitionProperty: "height, opacity, margin-top",
    transitionTimingFunction: DISCLOSURE_CONTENT_ANIMATION_EASING,
  };
}

interface CollapsibleDisclosureProps {
  buttonClassName: string;
  buttonLabel: ReactNode;
  children: ReactNode;
  className: string;
  contentClassName: string;
  contentShellClassName?: string;
  isExpanded: boolean;
  labelClassName?: string;
  onToggle: () => void;
}

export default function CollapsibleDisclosure({
  buttonClassName,
  buttonLabel,
  children,
  className,
  contentClassName,
  contentShellClassName = "",
  isExpanded,
  labelClassName = "",
  onToggle,
}: CollapsibleDisclosureProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) {
      setContentHeight(0);
      return;
    }
    const contentNode = node;

    function updateContentHeight(): void {
      setContentHeight(contentNode.scrollHeight);
    }

    updateContentHeight();

    const observer = new ResizeObserver(() => {
      updateContentHeight();
    });
    observer.observe(contentNode);

    return () => {
      observer.disconnect();
    };
  }, [children, isExpanded]);

  return (
    <section className={className}>
      <button
        aria-expanded={isExpanded}
        className={buttonClassName}
        type="button"
        onClick={onToggle}
      >
        <span className={labelClassName}>{buttonLabel}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={[
            "h-4 w-4 text-muted-foreground transition-transform",
            isExpanded ? "rotate-180" : "",
          ].join(" ")}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div
        aria-hidden={!isExpanded}
        style={getDisclosureContentShellStyle(isExpanded, contentHeight)}
        className={contentShellClassName}
      >
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      </div>
    </section>
  );
}

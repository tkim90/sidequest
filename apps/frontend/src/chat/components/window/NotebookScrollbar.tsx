import { useMemo, useRef, type RefObject } from "react";

const SCROLLBAR_TOP_INSET = 20;
const SCROLLBAR_BOTTOM_INSET = 40;
const SCROLLBAR_END_PADDING = 16;
const SCROLLBAR_MIN_THUMB_HEIGHT = 40;

interface ScrollbarMetrics {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}

interface ScrollbarState {
  dragTrackHeight: number;
  maxScrollTop: number;
  thumbHeight: number;
  thumbOffset: number;
  trackHeight: number;
}

function computeScrollbarState(
  metrics: ScrollbarMetrics,
): ScrollbarState | null {
  const { clientHeight, scrollHeight, scrollTop } = metrics;
  if (scrollHeight <= clientHeight || clientHeight <= 0) {
    return null;
  }

  const trackHeight = Math.max(
    0,
    clientHeight - SCROLLBAR_TOP_INSET - SCROLLBAR_BOTTOM_INSET,
  );
  const dragTrackHeight = Math.max(
    0,
    trackHeight - SCROLLBAR_END_PADDING * 2,
  );
  if (dragTrackHeight <= 0) {
    return null;
  }

  const thumbHeight = Math.max(
    SCROLLBAR_MIN_THUMB_HEIGHT,
    Math.min(
      dragTrackHeight,
      (clientHeight / scrollHeight) * dragTrackHeight,
    ),
  );
  const maxThumbOffset = dragTrackHeight - thumbHeight;
  const maxScrollTop = scrollHeight - clientHeight;
  const thumbOffset =
    SCROLLBAR_END_PADDING +
    (maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbOffset : 0);

  return {
    dragTrackHeight,
    maxScrollTop,
    thumbHeight,
    thumbOffset,
    trackHeight,
  };
}

interface NotebookScrollbarProps {
  isFixedPane: boolean;
  scrollbarMetrics: ScrollbarMetrics;
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onScrollbarMetricsChange: (metrics: ScrollbarMetrics) => void;
}

export default function NotebookScrollbar({
  isFixedPane,
  scrollbarMetrics,
  scrollRef,
  onScroll,
  onScrollbarMetricsChange,
}: NotebookScrollbarProps) {
  const dragOffsetRef = useRef(0);

  const scrollbarState = useMemo(
    () => computeScrollbarState(scrollbarMetrics),
    [scrollbarMetrics],
  );

  if (!scrollbarState) {
    return null;
  }

  function startScrollbarDrag(
    event: React.PointerEvent<HTMLDivElement>,
    mode: "thumb" | "track",
  ) {
    if (!scrollbarState) {
      return;
    }

    const node = scrollRef.current;
    if (!node) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const state = scrollbarState;

    const trackTop =
      node.getBoundingClientRect().top +
      SCROLLBAR_TOP_INSET +
      SCROLLBAR_END_PADDING;
    dragOffsetRef.current =
      mode === "thumb"
        ? event.clientY -
          trackTop -
          (state.thumbOffset - SCROLLBAR_END_PADDING)
        : state.thumbHeight / 2;

    const nextThumbOffset = Math.min(
      Math.max(0, event.clientY - trackTop - dragOffsetRef.current),
      state.dragTrackHeight - state.thumbHeight,
    );
    const scrollRatio =
      state.dragTrackHeight > state.thumbHeight
        ? nextThumbOffset / (state.dragTrackHeight - state.thumbHeight)
        : 0;
    node.scrollTop = scrollRatio * state.maxScrollTop;
    onScrollbarMetricsChange({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      scrollTop: node.scrollTop,
    });
    onScroll();

    function handlePointerMove(moveEvent: PointerEvent) {
      const activeNode = scrollRef.current;
      if (!activeNode) {
        return;
      }

      const activeTrackTop =
        activeNode.getBoundingClientRect().top +
        SCROLLBAR_TOP_INSET +
        SCROLLBAR_END_PADDING;
      const activeThumbOffset = Math.min(
        Math.max(
          0,
          moveEvent.clientY - activeTrackTop - dragOffsetRef.current,
        ),
        state.dragTrackHeight - state.thumbHeight,
      );
      const activeRatio =
        state.dragTrackHeight > state.thumbHeight
          ? activeThumbOffset / (state.dragTrackHeight - state.thumbHeight)
          : 0;

      activeNode.scrollTop = activeRatio * state.maxScrollTop;
      onScrollbarMetricsChange({
        clientHeight: activeNode.clientHeight,
        scrollHeight: activeNode.scrollHeight,
        scrollTop: activeNode.scrollTop,
      });
      onScroll();
    }

    function handlePointerUp() {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    }

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <div
      className={[
        "absolute bottom-10 right-1 top-5 z-20 hidden w-4 overflow-hidden transition-opacity duration-300 ease-out lg:block",
        isFixedPane
          ? "opacity-0 group-hover/notebook:opacity-100 group-focus-within/notebook:opacity-100"
          : "opacity-100",
      ].join(" ")}
      onPointerDown={(event) => startScrollbarDrag(event, "track")}
    >
      <div
        className="absolute left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-paper-raised/70"
        style={{
          bottom: SCROLLBAR_END_PADDING,
          top: SCROLLBAR_END_PADDING,
        }}
      />
      <div
        className="absolute left-1/2 w-1.5 -translate-x-1/2 cursor-ns-resize rounded-full bg-scrollbar-thumb shadow-[0_0_0_1px_rgb(205_188_163_/_0.18)] transition-colors duration-300"
        style={{
          height: scrollbarState.thumbHeight,
          transform: `translateY(${scrollbarState.thumbOffset}px)`,
        }}
        onPointerDown={(event) => startScrollbarDrag(event, "thumb")}
      />
    </div>
  );
}

export { computeScrollbarState };
export type { ScrollbarMetrics, ScrollbarState };

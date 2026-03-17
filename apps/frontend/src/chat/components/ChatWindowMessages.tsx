import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import type {
  AnchorGroupsByMessageKey,
  MessageRecord,
} from "../../types";
import AssistantReasoningPanel from "./AssistantReasoningPanel";
import MessageContent from "./MessageContent";

const STARTER_QUESTIONS = [
  "Code and visualize Dijkstra's algorithm in python",
  "Create a metrics dashboard about something random",
  "Create an OG image for social media using light colors",
] as const;

const FIXED_PANE_SCROLLBAR_TOP_INSET = 20;
const FIXED_PANE_SCROLLBAR_BOTTOM_INSET = 40;
const FIXED_PANE_SCROLLBAR_MIN_THUMB_HEIGHT = 40;

interface ChatWindowMessagesProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  historyPreviewCount: number;
  isFocused: boolean;
  isFixedPane?: boolean;
  isHistoryExpanded: boolean;
  messages: MessageRecord[];
  onMessageMouseDown: React.ComponentProps<typeof MessageContent>["onMessageMouseDown"];
  onStarterQuestionClick: (question: string) => void | Promise<void>;
  onRetry: (messageId: string) => void;
  onScroll: () => void;
  onToggleHistoryExpanded: () => void;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  windowId: string;
}

interface ChatMessageCardProps {
  anchorGroups: AnchorGroupsByMessageKey[string];
  isFocused: boolean;
  isFixedPane: boolean;
  message: MessageRecord;
  onMessageMouseDown: ChatWindowMessagesProps["onMessageMouseDown"];
  onRetry: ChatWindowMessagesProps["onRetry"];
  registerAnchorRef: ChatWindowMessagesProps["registerAnchorRef"];
  windowId: string;
}

const ChatMessageCard = memo(function ChatMessageCard({
  anchorGroups,
  isFocused,
  isFixedPane,
  message,
  onMessageMouseDown,
  onRetry,
  registerAnchorRef,
  windowId,
}: ChatMessageCardProps) {
  const messageClassName =
    message.role === "user"
      ? "ml-auto self-end max-w-[92%] px-3 py-2"
      : "self-start w-full";
  const contentClassName =
    message.role === "assistant"
      ? "font-normal text-foreground"
      : "text-right font-normal text-foreground/80";

  return (
    <section
      data-message-card
      className={`group relative cursor-text select-text ${messageClassName}`}
    >
      {message.role === "assistant" ? (
        <AssistantReasoningPanel
          isFixedPane={isFixedPane}
          message={message}
        />
      ) : null}
      <MessageContent
        windowId={windowId}
        message={message}
        anchorGroups={anchorGroups}
        className={contentClassName}
        isFocused={isFocused}
        registerAnchorRef={registerAnchorRef}
        onMessageMouseDown={onMessageMouseDown}
      />
      {message.role === "assistant" ? (
        <div className="mt-3 flex items-center justify-end gap-2 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
          {message.status === "complete" ? (
            <button
              className={[
                "flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-ring hover:text-foreground",
                "bg-paper-raised/80",
              ].join(" ")}
              title="Retry"
              type="button"
              onClick={() => onRetry(message.id)}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h5M20 20v-5h-5M5.1 15A7 7 0 0 0 19 12M18.9 9A7 7 0 0 0 5 12"
                />
              </svg>
            </button>
          ) : null}
          {message.model ? (
            <span
              className={[
                "inline-flex h-6 items-center border border-border px-2 text-[11px] font-medium tracking-tight text-muted-foreground",
                "bg-paper-raised/80",
              ].join(" ")}
            >
              {message.model}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}, areChatMessageCardPropsEqual);

function areChatMessageCardPropsEqual(
  previous: ChatMessageCardProps,
  next: ChatMessageCardProps,
): boolean {
  return (
    previous.windowId === next.windowId &&
    previous.message === next.message &&
    previous.anchorGroups === next.anchorGroups &&
    previous.isFocused === next.isFocused &&
    previous.isFixedPane === next.isFixedPane &&
    previous.onRetry === next.onRetry
  );
}

function ChatWindowMessages({
  anchorGroupsByMessageKey,
  historyPreviewCount,
  isFocused,
  isFixedPane = false,
  isHistoryExpanded,
  messages,
  onMessageMouseDown,
  onStarterQuestionClick,
  onRetry,
  onScroll,
  onToggleHistoryExpanded,
  registerAnchorRef,
  scrollRef,
  windowId,
}: ChatWindowMessagesProps) {
  const [scrollbarMetrics, setScrollbarMetrics] = useState({
    clientHeight: 0,
    scrollHeight: 0,
    scrollTop: 0,
  });
  const dragOffsetRef = useRef(0);
  const clampedHistoryPreviewCount = Math.min(historyPreviewCount, messages.length);
  const historyMessages = messages.slice(0, clampedHistoryPreviewCount);
  const visibleMessages =
    clampedHistoryPreviewCount > 0
      ? messages.slice(clampedHistoryPreviewCount)
      : messages;

  useEffect(() => {
    if (!isFixedPane) {
      return;
    }

    const activeNode = scrollRef.current;
    if (!activeNode) {
      return;
    }

    const node = activeNode;

    function updateScrollbarMetrics() {
      setScrollbarMetrics({
        clientHeight: node.clientHeight,
        scrollHeight: node.scrollHeight,
        scrollTop: node.scrollTop,
      });
    }

    updateScrollbarMetrics();

    const resizeObserver = new ResizeObserver(() => {
      updateScrollbarMetrics();
    });
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    historyPreviewCount,
    isFixedPane,
    isHistoryExpanded,
    messages,
    scrollRef,
  ]);

  const scrollbarState = useMemo(() => {
    if (!isFixedPane) {
      return null;
    }

    const { clientHeight, scrollHeight, scrollTop } = scrollbarMetrics;
    if (scrollHeight <= clientHeight || clientHeight <= 0) {
      return null;
    }

    const trackHeight = Math.max(
      0,
      clientHeight - FIXED_PANE_SCROLLBAR_TOP_INSET - FIXED_PANE_SCROLLBAR_BOTTOM_INSET,
    );
    if (trackHeight <= 0) {
      return null;
    }

    const thumbHeight = Math.max(
      FIXED_PANE_SCROLLBAR_MIN_THUMB_HEIGHT,
      Math.min(trackHeight, (clientHeight / scrollHeight) * trackHeight),
    );
    const maxThumbOffset = trackHeight - thumbHeight;
    const maxScrollTop = scrollHeight - clientHeight;
    const thumbOffset =
      maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbOffset : 0;

    return {
      maxScrollTop,
      thumbHeight,
      thumbOffset,
      trackHeight,
    };
  }, [isFixedPane, scrollbarMetrics]);

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

    const trackTop = node.getBoundingClientRect().top + FIXED_PANE_SCROLLBAR_TOP_INSET;
    dragOffsetRef.current =
      mode === "thumb"
        ? event.clientY - trackTop - state.thumbOffset
        : state.thumbHeight / 2;

    const nextThumbOffset = Math.min(
      Math.max(0, event.clientY - trackTop - dragOffsetRef.current),
      state.trackHeight - state.thumbHeight,
    );
    const scrollRatio =
      state.trackHeight > state.thumbHeight
        ? nextThumbOffset / (state.trackHeight - state.thumbHeight)
        : 0;
    node.scrollTop = scrollRatio * state.maxScrollTop;
    setScrollbarMetrics({
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
        activeNode.getBoundingClientRect().top + FIXED_PANE_SCROLLBAR_TOP_INSET;
      const activeThumbOffset = Math.min(
        Math.max(0, moveEvent.clientY - activeTrackTop - dragOffsetRef.current),
        state.trackHeight - state.thumbHeight,
      );
      const activeRatio =
        state.trackHeight > state.thumbHeight
          ? activeThumbOffset / (state.trackHeight - state.thumbHeight)
          : 0;

      activeNode.scrollTop = activeRatio * state.maxScrollTop;
      setScrollbarMetrics({
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

  const customScrollbar = scrollbarState ? (
    <div
      className="absolute bottom-10 right-1 top-5 z-20 hidden w-4 overflow-hidden opacity-0 transition-opacity duration-300 ease-out lg:block group-hover/notebook:opacity-100 group-focus-within/notebook:opacity-100"
      onPointerDown={(event) => startScrollbarDrag(event, "track")}
    >
      <div className="absolute inset-y-0 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-paper-raised/70" />
      <div
        className="absolute left-1/2 w-1.5 -translate-x-1/2 cursor-ns-resize rounded-full bg-scrollbar-thumb shadow-[0_0_0_1px_rgb(205_188_163_/_0.18)] transition-colors duration-300"
        style={{
          height: scrollbarState.thumbHeight,
          transform: `translateY(${scrollbarState.thumbOffset}px)`,
        }}
        onPointerDown={(event) => startScrollbarDrag(event, "thumb")}
      />
    </div>
  ) : null;

  function renderMessage(message: MessageRecord) {
    const messageKey = `${windowId}:${message.id}`;
    const anchorGroups = anchorGroupsByMessageKey[messageKey] || [];

    return (
      <ChatMessageCard
        key={message.id}
        anchorGroups={anchorGroups}
        isFocused={isFocused}
        isFixedPane={isFixedPane}
        message={message}
        onMessageMouseDown={onMessageMouseDown}
        onRetry={onRetry}
        registerAnchorRef={registerAnchorRef}
        windowId={windowId}
      />
    );
  }

  return (
    <div className="relative h-full min-h-0">
      <div
        className={[
          "flex h-full flex-col gap-4 overflow-auto",
          isFixedPane
            ? "notebook-scrollbar-hidden px-1 py-5 pr-7"
            : "px-4 py-5",
        ].join(" ")}
        ref={scrollRef}
        onScroll={() => {
          if (isFixedPane) {
            const node = scrollRef.current;
            if (node) {
              setScrollbarMetrics({
                clientHeight: node.clientHeight,
                scrollHeight: node.scrollHeight,
                scrollTop: node.scrollTop,
              });
            }
          }
          onScroll();
        }}
      >
        {messages.length === 0 ? (
          <section className="my-auto flex flex-col items-center">
            {STARTER_QUESTIONS.map((question, index) => (
              <button
                key={question}
                className={[
                  "block cursor-pointer bg-transparent px-2 py-2 text-center font-serif text-[24px] leading-[1.35] text-paper-ink-soft transition-colors duration-500 ease-out hover:text-foreground",
                  index > 0 ? "mt-1.5" : "",
                  isFixedPane ? "max-w-[28ch]" : "max-w-[24ch]",
                ].join(" ")}
                type="button"
                onClick={() => {
                  void onStarterQuestionClick(question);
                }}
              >
                {question}
              </button>
            ))}
          </section>
        ) : null}

        {historyMessages.length > 0 ? (
          <section
            className={[
              "border border-dashed border-border px-4 py-4 text-muted-foreground",
              isFixedPane ? "bg-paper-raised/80" : "bg-secondary/70",
            ].join(" ")}
          >
            <button
              aria-expanded={isHistoryExpanded}
              className="cursor-pointer text-sm font-semibold uppercase text-muted-foreground transition-colors hover:text-foreground"
              type="button"
              onClick={onToggleHistoryExpanded}
            >
              {isHistoryExpanded ? "Hide previous history" : "See previous history"}
            </button>
            {isHistoryExpanded && (
              <div className="mt-4 flex flex-col gap-4">
                {historyMessages.map(renderMessage)}
              </div>
            )}
          </section>
        ) : null}

        {visibleMessages.map(renderMessage)}
      </div>

      {customScrollbar}
    </div>
  );
}

export default ChatWindowMessages;

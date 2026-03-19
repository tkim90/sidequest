import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

import type {
  AnchorGroupsByMessageKey,
  MessageRecord,
} from "../../types";
import AssistantReasoningPanel from "./AssistantReasoningPanel";
import EmptyNoteBackground from "./EmptyNoteBackground";
import MessageContent from "./MessageContent";

const FIXED_PANE_SCROLLBAR_TOP_INSET = 20;
const FIXED_PANE_SCROLLBAR_BOTTOM_INSET = 40;
const FIXED_PANE_SCROLLBAR_MIN_THUMB_HEIGHT = 40;
const HISTORY_CONTENT_ANIMATION_DURATION_MS = 260;
const HISTORY_CONTENT_ANIMATION_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

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

export function getHistoryContentShellStyle(
  isExpanded: boolean,
  measuredHeight: number,
): CSSProperties {
  return {
    height: isExpanded ? measuredHeight : 0,
    marginTop: isExpanded ? 16 : 0,
    opacity: isExpanded ? 1 : 0,
    overflow: "hidden",
    pointerEvents: isExpanded ? "auto" : "none",
    transitionDuration: `${HISTORY_CONTENT_ANIMATION_DURATION_MS}ms`,
    transitionProperty: "height, opacity, margin-top",
    transitionTimingFunction: HISTORY_CONTENT_ANIMATION_EASING,
  };
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
  const roleKey = message.role === "assistant" ? "assistant" : "user";
  const roleConfig = CHAT_MESSAGE_ROLE_CONFIG[roleKey];
  const messageClassName = roleConfig.messageClassName;
  const contentClassName = roleConfig.getContentClassName(isFixedPane);

  return (
    <section
      data-message-card
      className={`group relative cursor-text select-text ${isFixedPane ? "w-full min-w-0" : ""} ${messageClassName}`.trim()}
    >
      {roleConfig.renderHeader({ isFixedPane, message })}
      <MessageContent
        windowId={windowId}
        message={message}
        anchorGroups={anchorGroups}
        className={contentClassName}
        isFocused={isFocused}
        registerAnchorRef={registerAnchorRef}
        onMessageMouseDown={onMessageMouseDown}
      />
      {roleConfig.renderFooter({
        isFixedPane,
        message,
        onRetry,
      })}
    </section>
  );
}, areChatMessageCardPropsEqual);

const CHAT_MESSAGE_ROLE_CONFIG = {
  user: {
    messageClassName: "px-4 py-2",
    getContentClassName: (isFixedPane: boolean) =>
      isFixedPane
        ? "w-full min-w-0 text-right font-normal text-foreground/80"
        : "text-right font-normal text-foreground/80 text-[16px] leading-[1.42]",
    renderHeader: () => null,
    renderFooter: () => null,
  },
  assistant: {
    messageClassName: "self-start w-full",
    getContentClassName: (isFixedPane: boolean) =>
      isFixedPane
        ? "w-full min-w-0 font-normal text-foreground"
        : "font-normal text-foreground text-[16px]",
    renderHeader: ({
      isFixedPane,
      message,
    }: Pick<ChatMessageCardProps, "isFixedPane" | "message">) => (
      <AssistantReasoningPanel
        isFixedPane={isFixedPane}
        message={message}
      />
    ),
    renderFooter: ({
      isFixedPane,
      message,
      onRetry,
    }: Pick<ChatMessageCardProps, "isFixedPane" | "message" | "onRetry">) => (
      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
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
              className={isFixedPane ? "h-3 w-3" : "h-3 w-3"}
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
              "inline-flex h-6 items-center border border-border px-3 text-[14px] font-medium tracking-tight text-muted-foreground rounded font-sans",
              "bg-paper-raised/80",
            ].join(" ")}
          >
            {message.model}
          </span>
        ) : null}
      </div>
    ),
  },
} as const;

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
  const historyContentRef = useRef<HTMLDivElement | null>(null);
  const [historyContentHeight, setHistoryContentHeight] = useState(0);
  const clampedHistoryPreviewCount = Math.min(historyPreviewCount, messages.length);
  const historyMessages = messages.slice(0, clampedHistoryPreviewCount);
  const visibleMessages =
    clampedHistoryPreviewCount > 0
      ? messages.slice(clampedHistoryPreviewCount)
      : messages;

  useLayoutEffect(() => {
    const node = historyContentRef.current;
    if (!node || historyMessages.length === 0) {
      setHistoryContentHeight(0);
      return;
    }
    const historyNode = node;

    function updateHistoryContentHeight(): void {
      setHistoryContentHeight(historyNode.scrollHeight);
    }

    updateHistoryContentHeight();

    const observer = new ResizeObserver(() => {
      updateHistoryContentHeight();
    });
    observer.observe(historyNode);

    return () => {
      observer.disconnect();
    };
  }, [historyMessages, isHistoryExpanded]);

  useEffect(() => {
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
    isHistoryExpanded,
    messages,
    scrollRef,
  ]);

  const scrollbarState = useMemo(() => {
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
      className={[
        "absolute bottom-10 right-1 top-5 z-20 hidden w-4 overflow-hidden transition-opacity duration-300 ease-out lg:block",
        isFixedPane
          ? "opacity-0 group-hover/notebook:opacity-100 group-focus-within/notebook:opacity-100"
          : "opacity-100",
      ].join(" ")}
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
    <div className="relative z-10 h-full min-h-0 min-w-0">
      <div
        className={[
          "flex h-full min-w-0 flex-col gap-2 overflow-auto",
          "notebook-scrollbar-hidden px-4 sm:px-8"
        ].join(" ")}
        ref={scrollRef}
        onScroll={() => {
          const node = scrollRef.current;
          if (node) {
            setScrollbarMetrics({
              clientHeight: node.clientHeight,
              scrollHeight: node.scrollHeight,
              scrollTop: node.scrollTop,
            });
          }
          onScroll();
        }}
      >
        {messages.length === 0 ? (
          <EmptyNoteBackground
            isFixedPane={isFixedPane}
            onStarterQuestionClick={onStarterQuestionClick}
          />
        ) : null}

        {historyMessages.length > 0 ? (
          <section
            className={[
              "min-w-0 border border-dashed border-border px-8 py-2 text-muted-foreground",
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
            <div
              aria-hidden={!isHistoryExpanded}
              data-history-shell="true"
              style={getHistoryContentShellStyle(
                isHistoryExpanded,
                historyContentHeight,
              )}
            >
              <div
                className="flex min-w-0 flex-col gap-4"
                ref={historyContentRef}
              >
                {historyMessages.map(renderMessage)}
              </div>
            </div>
          </section>
        ) : null}

        {visibleMessages.map(renderMessage)}
      </div>

      {customScrollbar}
    </div>
  );
}

export default ChatWindowMessages;

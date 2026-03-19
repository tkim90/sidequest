import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { motion } from "motion/react";

import type {
  AnchorGroupsByMessageKey,
  MessageRecord,
} from "../../types";
import AssistantReasoningPanel from "./AssistantReasoningPanel";
import MessageContent from "./MessageContent";

const STARTER_QUESTIONS = [
  "Write a poem about history and science.",
  "What was Dijkstra known for?",
  "Give me a random Jean Sartre quote.",
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

interface NotebookStampProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

function NotebookStamp({
  className,
  orientation = "horizontal",
}: NotebookStampProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox="0 0 220 170"
    >
      <g
        transform={
          orientation === "vertical"
            ? "translate(72 194) rotate(-90)"
            : undefined
        }
      >
        <path
          d="M25 15C31 20 37 20 43 15C49 10 55 10 61 15C67 20 73 20 79 15C85 10 91 10 97 15C103 20 109 20 115 15C121 10 127 10 133 15C139 20 145 20 151 15C157 10 163 10 169 15C175 20 181 20 187 15V155C181 150 175 150 169 155C163 160 157 160 151 155C145 150 139 150 133 155C127 160 121 160 115 155C109 150 103 150 97 155C91 160 85 160 79 155C73 150 67 150 61 155C55 160 49 160 43 155C37 150 31 150 25 155V15Z"
          className="fill-paper-sheet/60 stroke-paper-stroke/30"
          strokeWidth="2"
        />
        <path
          d="M54 47L148 47"
          className="stroke-paper-stroke/26"
          strokeLinecap="round"
          strokeWidth="2.6"
        />
        <path
          d="M54 68L166 68"
          className="stroke-paper-stroke/18"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M54 89L154 89"
          className="stroke-paper-stroke/22"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <path
          d="M54 112L136 112"
          className="stroke-paper-stroke/16"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
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
        : "text-right font-normal text-foreground/80 text-[24px] leading-[1.42]",
    renderHeader: () => null,
    renderFooter: () => null,
  },
  assistant: {
    messageClassName: "self-start w-full",
    getContentClassName: (isFixedPane: boolean) =>
      isFixedPane
        ? "w-full min-w-0 font-normal text-foreground"
        : "font-normal text-foreground text-[24px]",
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
      <div className="mt-3 flex items-center justify-end gap-2 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
        {message.status === "complete" ? (
          <button
            className={[
              isFixedPane
                ? "flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
                : "flex h-10 w-10 cursor-pointer items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-ring hover:text-foreground",
              "bg-paper-raised/80",
            ].join(" ")}
            title="Retry"
            type="button"
            onClick={() => onRetry(message.id)}
          >
            <svg
              className={isFixedPane ? "h-3.5 w-3.5" : "h-5 w-5"}
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
              isFixedPane
                ? "inline-flex h-6 items-center border border-border px-2 text-[11px] font-medium tracking-tight text-muted-foreground"
                : "inline-flex h-10 items-center border border-border px-3 text-[18px] font-medium tracking-tight text-muted-foreground",
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
  const [hoveredStarterQuestion, setHoveredStarterQuestion] = useState<string | null>(null);
  const dragOffsetRef = useRef(0);
  const clampedHistoryPreviewCount = Math.min(historyPreviewCount, messages.length);
  const historyMessages = messages.slice(0, clampedHistoryPreviewCount);
  const visibleMessages =
    clampedHistoryPreviewCount > 0
      ? messages.slice(clampedHistoryPreviewCount)
      : messages;

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
          "flex h-full min-w-0 flex-col gap-4 overflow-auto",
          "notebook-scrollbar-hidden px-4 sm:px-12 py-5"
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
          <section
            className={[
              "relative my-auto isolate overflow-hidden",
              isFixedPane
                ? "min-h-[360px] px-4 py-8"
                : "min-h-[300px] px-3 py-6",
            ].join(" ")}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 opacity-80"
              style={{
                backgroundImage:
                  "linear-gradient(to bottom, transparent, transparent 11px, var(--paper-rule) 11px, transparent 12px)",
                backgroundSize: "100% 34px",
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)",
              }}
            />
            <NotebookStamp
              className="pointer-events-none absolute left-[12%] top-[18%] z-10 h-[200px] w-[150px] -rotate-[8deg] text-paper-stroke"
              orientation="vertical"
            />
            <NotebookStamp
              className="pointer-events-none absolute bottom-[16%] right-[10%] z-10 h-[150px] w-[210px] rotate-[7deg] text-paper-stroke"
              orientation="horizontal"
            />
            <div className="relative z-20 flex min-h-full flex-col items-center justify-center">
              {STARTER_QUESTIONS.map((question, index) => (
                <motion.div
                  key={question}
                  animate={{ y: hoveredStarterQuestion === question ? -6 : 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  onMouseEnter={() => setHoveredStarterQuestion(question)}
                  onMouseLeave={() => setHoveredStarterQuestion((current) => (
                    current === question ? null : current
                  ))}
                >
                  <button
                    className={[
                      "block cursor-pointer bg-transparent px-3 py-2 text-center font-serif text-[24px] leading-[1.35] text-foreground transition-colors duration-500 ease-out hover:text-paper-ink-soft",
                      index > 0 ? "mt-2" : "",
                      isFixedPane ? "max-w-[28ch]" : "max-w-[24ch]",
                    ].join(" ")}
                    type="button"
                    onClick={() => {
                      void onStarterQuestionClick(question);
                    }}
                  >
                    {question}
                  </button>
                </motion.div>
              ))}
            </div>
          </section>
        ) : null}

        {historyMessages.length > 0 ? (
          <section
            className={[
              "min-w-0 border border-dashed border-border px-4 py-4 text-muted-foreground",
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
              <div className="mt-4 flex min-w-0 flex-col gap-4">
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

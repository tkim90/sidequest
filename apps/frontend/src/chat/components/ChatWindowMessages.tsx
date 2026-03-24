import {
  useEffect,
  useState,
  type RefObject,
} from "react";

import type {
  AnchorGroupsByMessageKey,
  MessageRecord,
} from "../../types";
import CollapsibleDisclosure from "./CollapsibleDisclosure";
import EmptyNoteBackground from "./EmptyNoteBackground";
import ChatMessageCard from "./ChatMessageCard";
import NotebookScrollbar, { type ScrollbarMetrics } from "./NotebookScrollbar";

interface ChatWindowMessagesProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  historyPreviewCount: number;
  isFocused: boolean;
  isFixedPane?: boolean;
  isHistoryExpanded: boolean;
  messages: MessageRecord[];
  onMessageMouseDown: React.ComponentProps<typeof ChatMessageCard>["onMessageMouseDown"];
  onStarterQuestionClick: (question: string) => void | Promise<void>;
  onRetry: (messageId: string) => void;
  onScroll: () => void;
  onToggleHistoryExpanded: () => void;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
  windowId: string;
}

// Re-export for existing test consumers
export { getReasoningDisclosureData } from "./ChatMessageCard";
export type { ReasoningDisclosureData } from "./ChatMessageCard";

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
  const [scrollbarMetrics, setScrollbarMetrics] = useState<ScrollbarMetrics>({
    clientHeight: 0,
    scrollHeight: 0,
    scrollTop: 0,
  });

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
          <CollapsibleDisclosure
            buttonClassName="flex w-full cursor-pointer items-center justify-between gap-3 text-left text-sm font-semibold uppercase text-muted-foreground transition-colors hover:text-foreground"
            buttonLabel="See previous history"
            className={[
              "min-w-0 border border-dashed border-border px-8 py-2 text-muted-foreground rounded-lg",
              isFixedPane ? "bg-paper-raised/80" : "bg-secondary/70",
            ].join(" ")}
            contentClassName="flex min-w-0 flex-col gap-4"
            isExpanded={isHistoryExpanded}
            labelClassName=""
            onToggle={onToggleHistoryExpanded}
          >
            {historyMessages.map(renderMessage)}
          </CollapsibleDisclosure>
        ) : null}

        {visibleMessages.map(renderMessage)}
      </div>

      <NotebookScrollbar
        isFixedPane={isFixedPane}
        scrollbarMetrics={scrollbarMetrics}
        scrollRef={scrollRef}
        onScroll={onScroll}
        onScrollbarMetricsChange={setScrollbarMetrics}
      />
    </div>
  );
}

export default ChatWindowMessages;

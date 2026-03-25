import {
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import { useMountEffect } from "../../../hooks/useMountEffect";
import type {
  AnchorGroupsByMessageKey,
  MessageRecord,
} from "../../../types";
import CollapsibleDisclosure from "../message/CollapsibleDisclosure";
import EmptyNoteBackground from "../message/EmptyNoteBackground";
import ChatMessageCard from "../message/ChatMessageCard";
import NotebookScrollbar, { type ScrollbarMetrics } from "./NotebookScrollbar";

const SCROLLBAR_INACTIVITY_DELAY_MS = 2000;

interface ChatWindowMessagesProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  historyPreviewCount: number;
  isFocused: boolean;
  isFixedPane?: boolean;
  isHistoryExpanded: boolean;
  messages: MessageRecord[];
  mobileInteractionMode?: "scroll" | "scroll-first-swipe";
  onMobileBodyPointerDown?: React.ComponentProps<"div">["onPointerDown"];
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
export { getReasoningDisclosureData } from "../message/ChatMessageCard";
export type { ReasoningDisclosureData } from "../message/ChatMessageCard";

type ScrollbarHideTimer = ReturnType<typeof globalThis.setTimeout>;

interface ScrollbarVisibilityControllerOptions {
  clearTimeoutFn?: typeof globalThis.clearTimeout;
  hideDelayMs?: number;
  isHoveringRef: { current: boolean };
  setTimeoutFn?: typeof globalThis.setTimeout;
  setVisible: (isVisible: boolean) => void;
  timeoutRef: { current: ScrollbarHideTimer | null };
}

export function createScrollbarVisibilityController({
  clearTimeoutFn = globalThis.clearTimeout,
  hideDelayMs = SCROLLBAR_INACTIVITY_DELAY_MS,
  isHoveringRef,
  setTimeoutFn = globalThis.setTimeout,
  setVisible,
  timeoutRef,
}: ScrollbarVisibilityControllerOptions) {
  function clearHideTimer(): void {
    if (timeoutRef.current === null) {
      return;
    }

    clearTimeoutFn(timeoutRef.current);
    timeoutRef.current = null;
  }

  function scheduleHide(): void {
    clearHideTimer();

    if (isHoveringRef.current) {
      return;
    }

    timeoutRef.current = setTimeoutFn(() => {
      timeoutRef.current = null;
      if (isHoveringRef.current) {
        return;
      }

      setVisible(false);
    }, hideDelayMs);
  }

  return {
    clearHideTimer,
    dispose: clearHideTimer,
    handleMouseEnter(): void {
      isHoveringRef.current = true;
      clearHideTimer();
      setVisible(true);
    },
    handleMouseLeave(): void {
      isHoveringRef.current = false;
      scheduleHide();
    },
    revealFromActivity(): void {
      setVisible(true);
      scheduleHide();
    },
  };
}

function ChatWindowMessages({
  anchorGroupsByMessageKey,
  historyPreviewCount,
  isFocused,
  isFixedPane = false,
  isHistoryExpanded,
  messages,
  mobileInteractionMode,
  onMobileBodyPointerDown,
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
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const isScrollbarHoveringRef = useRef(false);
  const scrollbarHideTimerRef = useRef<ScrollbarHideTimer | null>(null);

  const clampedHistoryPreviewCount = Math.min(historyPreviewCount, messages.length);
  const historyMessages = messages.slice(0, clampedHistoryPreviewCount);
  const visibleMessages =
    clampedHistoryPreviewCount > 0
      ? messages.slice(clampedHistoryPreviewCount)
      : messages;
  const scrollbarVisibilityControllerRef = useRef(
    createScrollbarVisibilityController({
      isHoveringRef: isScrollbarHoveringRef,
      setVisible: setIsScrollbarVisible,
      timeoutRef: scrollbarHideTimerRef,
    }),
  );
  const scrollbarVisibilityController = scrollbarVisibilityControllerRef.current;

  function updateScrollbarMetrics() {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    setScrollbarMetrics({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      scrollTop: node.scrollTop,
    });
  }

  useLayoutEffect(() => {
    updateScrollbarMetrics();
  }, [
    historyPreviewCount,
    isHistoryExpanded,
    messages,
    scrollRef,
  ]);

  useMountEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      setScrollbarMetrics({
        clientHeight: node.clientHeight,
        scrollHeight: node.scrollHeight,
        scrollTop: node.scrollTop,
      });
    });
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  });

  useMountEffect(() => {
    return () => {
      scrollbarVisibilityController.dispose();
    };
  });

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

  const isMobileScrollSurface = mobileInteractionMode === "scroll";
  const isMobileSwipeSurface = mobileInteractionMode === "scroll-first-swipe";
  const canShowScrollbar =
    scrollbarMetrics.clientHeight > 0 &&
    scrollbarMetrics.scrollHeight > scrollbarMetrics.clientHeight;

  function revealScrollbarFromActivity(): void {
    scrollbarVisibilityController.revealFromActivity();
  }

  return (
    <div
      className="relative z-10 h-full min-h-0 min-w-0"
      onMouseEnter={() => scrollbarVisibilityController.handleMouseEnter()}
      onMouseLeave={() => scrollbarVisibilityController.handleMouseLeave()}
    >
      <div
        className={[
          "flex h-full min-w-0 flex-col gap-2 overflow-auto",
          "notebook-scrollbar-hidden px-4 sm:px-8",
        ].join(" ")}
        data-mobile-drag-surface={isMobileSwipeSurface ? "true" : undefined}
        data-mobile-scroll-surface={
          isMobileScrollSurface || isMobileSwipeSurface ? "true" : undefined
        }
        ref={scrollRef}
        style={
          isMobileScrollSurface || isMobileSwipeSurface
            ? { touchAction: "pan-y" }
            : undefined
        }
        onPointerDown={onMobileBodyPointerDown}
        onScroll={() => {
          const node = scrollRef.current;
          if (node) {
            setScrollbarMetrics({
              clientHeight: node.clientHeight,
              scrollHeight: node.scrollHeight,
              scrollTop: node.scrollTop,
            });
          }
          revealScrollbarFromActivity();
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
        isVisible={canShowScrollbar && isScrollbarVisible}
        scrollbarMetrics={scrollbarMetrics}
        scrollRef={scrollRef}
        onScroll={() => {
          revealScrollbarFromActivity();
          onScroll();
        }}
        onScrollbarMetricsChange={setScrollbarMetrics}
      />
    </div>
  );
}

export default ChatWindowMessages;
export { SCROLLBAR_INACTIVITY_DELAY_MS };

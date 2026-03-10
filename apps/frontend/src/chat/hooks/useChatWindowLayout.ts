import { useEffect, useLayoutEffect, useRef } from "react";

import type { MessageRecord, WindowScrollState } from "../../types";

const AUTO_SCROLL_THRESHOLD = 32;

interface UseChatWindowLayoutOptions {
  composer: string;
  height: number;
  inheritedMessageCount: number;
  isFocused: boolean;
  isHistoryExpanded: boolean;
  messages: MessageRecord[];
  onGeometryChange: () => void;
  onWindowScrollStateChange: (
    windowId: string,
    nextState: WindowScrollState,
  ) => void;
  savedScrollState: WindowScrollState;
  windowId: string;
  width: number;
}

export function useChatWindowLayout({
  composer,
  height,
  inheritedMessageCount,
  isFocused,
  isHistoryExpanded,
  messages,
  onGeometryChange,
  onWindowScrollStateChange,
  savedScrollState,
  windowId,
  width,
}: UseChatWindowLayoutOptions) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const didHydrateScrollRef = useRef(false);
  const savedScrollStateRef = useRef(savedScrollState);
  const shouldAutoScrollRef = useRef(savedScrollState.shouldAutoScroll);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  savedScrollStateRef.current = savedScrollState;

  function computeShouldAutoScroll(node: HTMLDivElement): boolean {
    const distanceFromBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight;
    return distanceFromBottom <= AUTO_SCROLL_THRESHOLD;
  }

  function persistScrollState(node: HTMLDivElement): void {
    const nextState = {
      scrollTop: node.scrollTop,
      shouldAutoScroll: computeShouldAutoScroll(node),
    };

    shouldAutoScrollRef.current = nextState.shouldAutoScroll;
    onWindowScrollStateChange(windowId, nextState);
  }

  function restoreScrollState(node: HTMLDivElement): void {
    const nextState = savedScrollStateRef.current;

    if (nextState.shouldAutoScroll) {
      node.scrollTop = node.scrollHeight;
    } else if (nextState.scrollTop !== null) {
      const maxScrollTop = Math.max(0, node.scrollHeight - node.clientHeight);
      node.scrollTop = Math.min(nextState.scrollTop, maxScrollTop);
    }

    persistScrollState(node);
  }

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    restoreScrollState(node);
    didHydrateScrollRef.current = true;
  }, []);

  useLayoutEffect(() => {
    if (!didHydrateScrollRef.current || !isFocused) {
      return;
    }

    const node = scrollRef.current;
    if (!node) {
      return;
    }

    restoreScrollState(node);
  }, [isFocused]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    if (shouldAutoScrollRef.current) {
      node.scrollTop = node.scrollHeight;
    }

    persistScrollState(node);
    onGeometryChange();
  }, [messages, height, onGeometryChange, width]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    persistScrollState(node);
    onGeometryChange();
  }, [inheritedMessageCount, isHistoryExpanded, onGeometryChange, onWindowScrollStateChange, windowId]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [composer]);

  function handleMessagesScroll(): void {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    persistScrollState(node);
    onGeometryChange();
  }

  return {
    scrollRef,
    textareaRef,
    onMessagesScroll: handleMessagesScroll,
  };
}

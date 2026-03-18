import { useEffect, useLayoutEffect, useRef } from "react";

import type { MessageRecord, WindowScrollState } from "../../types";

const AUTO_SCROLL_THRESHOLD = 32;

interface UseChatWindowLayoutOptions {
  composer: string;
  height: number;
  inheritedMessageCount: number;
  isFocused: boolean;
  isHistoryExpanded: boolean;
  isChildPane?: boolean;
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
  isChildPane = false,
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
  const geometrySignatureRef = useRef<string>("");
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

  function notifyGeometryIfChanged(node: HTMLDivElement): void {
    const signature = [
      Math.round(node.scrollTop),
      Math.round(node.scrollHeight),
      Math.round(node.clientHeight),
      messages.length,
      height,
      width,
      inheritedMessageCount,
      Number(isHistoryExpanded),
    ].join(":");

    if (geometrySignatureRef.current === signature) {
      return;
    }

    geometrySignatureRef.current = signature;
    onGeometryChange();
  }

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    restoreScrollState(node);
    didHydrateScrollRef.current = true;
    notifyGeometryIfChanged(node);
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
    notifyGeometryIfChanged(node);
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
    notifyGeometryIfChanged(node);
  }, [messages, height, onGeometryChange, width]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    persistScrollState(node);
    notifyGeometryIfChanged(node);
  }, [inheritedMessageCount, isHistoryExpanded, onGeometryChange, onWindowScrollStateChange, windowId]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const maxHeight = isChildPane ? 120 : 200;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [composer, isChildPane]);

  function handleMessagesScroll(): void {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    persistScrollState(node);
    notifyGeometryIfChanged(node);
  }

  return {
    scrollRef,
    textareaRef,
    onMessagesScroll: handleMessagesScroll,
  };
}

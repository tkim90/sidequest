import { useEffect, useLayoutEffect, useRef } from "react";

import type { MessageRecord, WindowScrollState } from "../../types";

const AUTO_SCROLL_THRESHOLD = 32;

interface ResolveScrollTopAfterContentChangeOptions {
  clientHeight: number;
  isStreaming: boolean;
  savedScrollTop: number | null;
  scrollHeight: number;
  shouldAutoScroll: boolean;
  streamScrollLock: number | null;
}

interface UseChatWindowLayoutOptions {
  composer: string;
  height: number;
  inheritedMessageCount: number;
  isFocused: boolean;
  isHistoryExpanded: boolean;
  isStreaming: boolean;
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

function clampScrollTop(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): number {
  const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
  return Math.min(Math.max(scrollTop, 0), maxScrollTop);
}

export function resolveScrollTopAfterContentChange({
  clientHeight,
  isStreaming,
  savedScrollTop,
  scrollHeight,
  shouldAutoScroll,
  streamScrollLock,
}: ResolveScrollTopAfterContentChangeOptions): number | null {
  const maxScrollTop = Math.max(0, scrollHeight - clientHeight);

  if (isStreaming) {
    if (streamScrollLock !== null) {
      return clampScrollTop(streamScrollLock, scrollHeight, clientHeight);
    }

    return maxScrollTop;
  }

  if (shouldAutoScroll) {
    return maxScrollTop;
  }

  if (savedScrollTop !== null) {
    return clampScrollTop(savedScrollTop, scrollHeight, clientHeight);
  }

  return null;
}

export function useChatWindowLayout({
  composer,
  height,
  inheritedMessageCount,
  isFocused,
  isHistoryExpanded,
  isStreaming,
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
  const programmaticScrollTargetRef = useRef<number | null>(null);
  const streamScrollLockRef = useRef<number | null>(null);
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

  function applyScrollTop(node: HTMLDivElement, scrollTop: number): void {
    programmaticScrollTargetRef.current = scrollTop;
    node.scrollTop = scrollTop;
  }

  function restoreScrollState(node: HTMLDivElement): void {
    const nextState = savedScrollStateRef.current;
    const nextScrollTop = resolveScrollTopAfterContentChange({
      clientHeight: node.clientHeight,
      isStreaming,
      savedScrollTop: nextState.scrollTop,
      scrollHeight: node.scrollHeight,
      shouldAutoScroll: nextState.shouldAutoScroll,
      streamScrollLock: streamScrollLockRef.current,
    });

    if (nextScrollTop !== null) {
      applyScrollTop(node, nextScrollTop);
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
  }, [isFocused, isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      streamScrollLockRef.current = null;
    }
  }, [isStreaming]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    const nextScrollTop = resolveScrollTopAfterContentChange({
      clientHeight: node.clientHeight,
      isStreaming,
      savedScrollTop: savedScrollStateRef.current.scrollTop,
      scrollHeight: node.scrollHeight,
      shouldAutoScroll: shouldAutoScrollRef.current,
      streamScrollLock: streamScrollLockRef.current,
    });

    if (nextScrollTop !== null) {
      applyScrollTop(node, nextScrollTop);
    }

    persistScrollState(node);
    notifyGeometryIfChanged(node);
  }, [height, isStreaming, messages, onGeometryChange, width]);

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

    const maxHeight = isChildPane ? 92 : 200;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [composer, isChildPane]);

  function handleMessagesScroll(): void {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    if (
      programmaticScrollTargetRef.current !== null &&
      Math.abs(node.scrollTop - programmaticScrollTargetRef.current) <= 1
    ) {
      programmaticScrollTargetRef.current = null;
      return;
    }

    if (isStreaming) {
      streamScrollLockRef.current = node.scrollTop;
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

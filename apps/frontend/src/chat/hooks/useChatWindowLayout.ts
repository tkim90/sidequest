import { useEffect, useLayoutEffect, useRef } from "react";

import type { MessageRecord } from "../../types";

interface UseChatWindowLayoutOptions {
  composer: string;
  height: number;
  messages: MessageRecord[];
  onGeometryChange: () => void;
  width: number;
}

export function useChatWindowLayout({
  composer,
  height,
  messages,
  onGeometryChange,
  width,
}: UseChatWindowLayoutOptions) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    const id = requestAnimationFrame(() => {
      node.scrollTop = node.scrollHeight;
      shouldAutoScrollRef.current = true;
    });

    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    if (shouldAutoScrollRef.current) {
      node.scrollTop = node.scrollHeight;
    }

    onGeometryChange();
  }, [messages, height, onGeometryChange, width]);

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

    const distanceFromBottom =
      node.scrollHeight - node.scrollTop - node.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom <= 32;
    onGeometryChange();
  }

  return {
    scrollRef,
    textareaRef,
    onMessagesScroll: handleMessagesScroll,
  };
}

import { memo, type RefObject } from "react";

import type {
  AnchorGroupsByMessageKey,
  MessageRecord,
} from "../../types";
import MessageContent from "./MessageContent";
import { eyebrowClassName } from "./ui";

interface ChatWindowMessagesProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  historyPreviewCount: number;
  isFocused: boolean;
  isHistoryExpanded: boolean;
  messages: MessageRecord[];
  onMessageMouseDown: React.ComponentProps<typeof MessageContent>["onMessageMouseDown"];
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
  message: MessageRecord;
  onMessageMouseDown: ChatWindowMessagesProps["onMessageMouseDown"];
  onRetry: ChatWindowMessagesProps["onRetry"];
  registerAnchorRef: ChatWindowMessagesProps["registerAnchorRef"];
  windowId: string;
}

const ChatMessageCard = memo(function ChatMessageCard({
  anchorGroups,
  isFocused,
  message,
  onMessageMouseDown,
  onRetry,
  registerAnchorRef,
  windowId,
}: ChatMessageCardProps) {
  const messageClassName =
    message.role === "user"
      ? "self-end border border-zinc-950 bg-zinc-950 text-zinc-50"
      : "self-start border border-zinc-300 bg-white text-zinc-950";

  return (
    <section
      data-message-card
      className={`relative ${message.role === "user" ? "w-[92%]" : "w-full"} cursor-text select-text px-4 py-4 ${messageClassName}`}
    >
      {message.role === "user" ? (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
          You
        </p>
      ) : (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className={eyebrowClassName}>Assistant</p>
          {message.model ? (
            <span className="inline-flex items-center border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-[11px] font-medium tracking-tight text-zinc-600">
              {message.model}
            </span>
          ) : null}
        </div>
      )}
      <MessageContent
        windowId={windowId}
        message={message}
        anchorGroups={anchorGroups}
        isFocused={isFocused}
        registerAnchorRef={registerAnchorRef}
        onMessageMouseDown={onMessageMouseDown}
      />
      {message.role === "assistant" && message.status === "complete" ? (
        <button
          className="absolute right-2 bottom-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-zinc-200 bg-zinc-50 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-700"
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
    previous.onRetry === next.onRetry
  );
}

function ChatWindowMessages({
  anchorGroupsByMessageKey,
  historyPreviewCount,
  isFocused,
  isHistoryExpanded,
  messages,
  onMessageMouseDown,
  onRetry,
  onScroll,
  onToggleHistoryExpanded,
  registerAnchorRef,
  scrollRef,
  windowId,
}: ChatWindowMessagesProps) {
  const clampedHistoryPreviewCount = Math.min(historyPreviewCount, messages.length);
  const historyMessages = messages.slice(0, clampedHistoryPreviewCount);
  const visibleMessages =
    clampedHistoryPreviewCount > 0
      ? messages.slice(clampedHistoryPreviewCount)
      : messages;

  function renderMessage(message: MessageRecord) {
    const messageKey = `${windowId}:${message.id}`;
    const anchorGroups = anchorGroupsByMessageKey[messageKey] || [];

    return (
      <ChatMessageCard
        key={message.id}
        anchorGroups={anchorGroups}
        isFocused={isFocused}
        message={message}
        onMessageMouseDown={onMessageMouseDown}
        onRetry={onRetry}
        registerAnchorRef={registerAnchorRef}
        windowId={windowId}
      />
    );
  }

  return (
    <div
      className="flex flex-col gap-4 overflow-auto p-5"
      ref={scrollRef}
      onScroll={onScroll}
    >
      {messages.length === 0 ? (
        <div className="my-auto border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">
          <p className="m-0">No messages yet.</p>
          <p className="mt-2 m-0">
            Ask something here, then highlight a phrase to branch it.
          </p>
        </div>
      ) : null}

      {historyMessages.length > 0 ? (
        <section className="border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-zinc-700">
          <button
            aria-expanded={isHistoryExpanded}
            className="cursor-pointer text-sm font-semibold uppercase text-zinc-700 transition-colors hover:text-zinc-950"
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
  );
}

export default ChatWindowMessages;

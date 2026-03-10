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
  registerAnchorRef: ChatWindowMessagesProps["registerAnchorRef"];
  windowId: string;
}

const ChatMessageCard = memo(function ChatMessageCard({
  anchorGroups,
  isFocused,
  message,
  onMessageMouseDown,
  registerAnchorRef,
  windowId,
}: ChatMessageCardProps) {
  const messageClassName =
    message.role === "user"
      ? "self-end border border-zinc-950 bg-zinc-950 text-zinc-50"
      : "self-start border border-zinc-300 bg-white text-zinc-950";
  const messageLabelClassName =
    message.role === "user"
      ? "mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400"
      : `${eyebrowClassName} mb-3`;

  return (
    <section
      data-message-card
      className={`${message.role === "user" ? "w-[92%]" : "w-full"} cursor-text select-text px-4 py-4 ${messageClassName}`}
    >
      <p className={messageLabelClassName}>
        {message.role === "user" ? "You" : "Assistant"}
      </p>
      <MessageContent
        windowId={windowId}
        message={message}
        anchorGroups={anchorGroups}
        isFocused={isFocused}
        registerAnchorRef={registerAnchorRef}
        onMessageMouseDown={onMessageMouseDown}
      />
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
    previous.isFocused === next.isFocused
  );
}

function ChatWindowMessages({
  anchorGroupsByMessageKey,
  historyPreviewCount,
  isFocused,
  isHistoryExpanded,
  messages,
  onMessageMouseDown,
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

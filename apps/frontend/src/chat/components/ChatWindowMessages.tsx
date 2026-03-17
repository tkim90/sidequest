import { memo, type RefObject } from "react";

import type {
  AnchorGroupsByMessageKey,
  MessageRecord,
} from "../../types";
import AssistantReasoningPanel from "./AssistantReasoningPanel";
import MessageContent from "./MessageContent";

const STARTER_QUESTIONS = [
  "Code and visualize Dijkstra's algorithm in python",
  "Create a metrics dashboard about something random",
  "Create an OG image for social media using light colors",
] as const;

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
  const messageClassName =
    message.role === "user"
      ? "self-end border border-primary bg-primary text-primary-foreground"
      : isFixedPane
        ? "self-start border border-border bg-paper-sheet text-card-foreground"
        : "self-start border border-border bg-card text-card-foreground";

  return (
    <section
      data-message-card
      className={`relative ${message.role === "user" ? "w-[92%]" : "w-full"} cursor-text select-text px-4 py-4 ${messageClassName}`}
    >
      {message.role === "user" ? (
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary-foreground/70">
          You
        </p>
      ) : (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Assistant</p>
          {message.model ? (
            <span
              className={[
                "inline-flex items-center border border-border px-1.5 py-0.5 text-[11px] font-medium tracking-tight text-muted-foreground",
                isFixedPane ? "bg-paper-raised" : "bg-secondary",
              ].join(" ")}
            >
              {message.model}
            </span>
          ) : null}
        </div>
      )}
      {message.role === "assistant" ? (
        <AssistantReasoningPanel
          isFixedPane={isFixedPane}
          message={message}
        />
      ) : null}
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
          className={[
            "absolute bottom-2 right-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-ring hover:text-foreground",
            isFixedPane ? "bg-paper-raised" : "bg-secondary",
          ].join(" ")}
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
    <div
      className={[
        "flex flex-col gap-4 overflow-auto",
        isFixedPane ? "px-1 py-5" : "p-5",
      ].join(" ")}
      ref={scrollRef}
      onScroll={onScroll}
    >
      {messages.length === 0 ? (
        <section
          className={[
            "my-auto border border-dashed border-border",
            isFixedPane ? "bg-paper-raised/80" : "bg-secondary/70",
          ].join(" ")}
        >
          {STARTER_QUESTIONS.map((question, index) => (
            <button
              key={question}
              className={`block w-full cursor-pointer px-5 py-4 text-left text-[17px] leading-7 text-foreground transition-colors hover:bg-accent/60 hover:text-accent-foreground ${
                index > 0 ? "border-t border-border/70" : ""
              }`}
              type="button"
              onClick={() => {
                void onStarterQuestionClick(question);
              }}
            >
              {question}
            </button>
          ))}
        </section>
      ) : null}

      {historyMessages.length > 0 ? (
        <section
          className={[
            "border border-dashed border-border px-4 py-4 text-muted-foreground",
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

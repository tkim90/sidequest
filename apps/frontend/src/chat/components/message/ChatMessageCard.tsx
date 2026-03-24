import { memo, useMemo, useState } from "react";

import type { AnchorGroup, AnchorGroupsByMessageKey, MessageRecord } from "../../../types";
import CollapsibleDisclosure from "./CollapsibleDisclosure";
import MessageContent from "./MessageContent";
import MarkdownContent from "../../markdown/MarkdownContent";
import AssistantMessageFooter from "./AssistantMessageFooter";

const EMPTY_ANCHORS: AnchorGroup[] = [];

function noopRegisterAnchorRef(): void {
  return undefined;
}

function noopMouseDown(): void {
  return undefined;
}

export interface ReasoningDisclosureData {
  displayedReasoning: string | null;
  reasoningMessage: MessageRecord | null;
}

export function getReasoningDisclosureData(
  message: MessageRecord,
): ReasoningDisclosureData {
  const displayedReasoning =
    message.reasoningRawContent || message.reasoningSummaryContent || null;

  if (!displayedReasoning) {
    return {
      displayedReasoning: null,
      reasoningMessage: null,
    };
  }

  return {
    displayedReasoning,
    reasoningMessage: {
      ...message,
      id: `${message.id}:reasoning`,
      content: displayedReasoning,
    },
  };
}

export interface ChatMessageCardProps {
  anchorGroups: AnchorGroupsByMessageKey[string];
  isFocused: boolean;
  isFixedPane: boolean;
  message: MessageRecord;
  onMessageMouseDown: (
    event: React.MouseEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
  onRetry: (messageId: string) => void;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  windowId: string;
}

const ROLE_MESSAGE_CLASS = {
  user: "px-4 py-2",
  assistant: "self-start w-full",
} as const;

function getUserContentClassName(isFixedPane: boolean): string {
  return isFixedPane
    ? "w-full min-w-0 text-right font-normal text-foreground/80"
    : "text-right font-normal text-foreground/80 text-[16px] leading-[1.42]";
}

function getAssistantContentClassName(isFixedPane: boolean): string {
  return isFixedPane
    ? "w-full min-w-0 font-normal text-foreground"
    : "font-normal text-foreground text-[16px]";
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
  const isAssistant = message.role === "assistant";
  const messageClassName = isAssistant
    ? ROLE_MESSAGE_CLASS.assistant
    : ROLE_MESSAGE_CLASS.user;
  const contentClassName = isAssistant
    ? getAssistantContentClassName(isFixedPane)
    : getUserContentClassName(isFixedPane);

  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
  const { displayedReasoning, reasoningMessage } = useMemo(
    () => getReasoningDisclosureData(message),
    [message],
  );

  const reasoningDisclosure =
    isAssistant && displayedReasoning && reasoningMessage ? (
      <CollapsibleDisclosure
        buttonClassName="flex w-full cursor-pointer items-center justify-between gap-3 text-left text-sm font-semibold uppercase text-muted-foreground transition-colors hover:text-foreground"
        buttonLabel="Reasoning"
        className={[
          "min-w-0 border border-dashed border-border px-8 py-2 text-muted-foreground rounded-lg",
          isFixedPane ? "bg-paper-raised/80" : "bg-secondary/70",
        ].join(" ")}
        contentClassName="min-w-0 border-t border-border px-4 py-4"
        contentShellClassName="min-w-0"
        isExpanded={isReasoningExpanded}
        labelClassName=""
        onToggle={() => setIsReasoningExpanded((current) => !current)}
      >
        <MarkdownContent
          windowId=""
          message={reasoningMessage}
          anchorGroups={EMPTY_ANCHORS}
          isFocused={false}
          className="text-[16px] leading-6 text-muted-foreground"
          hideStreamingChrome
          registerAnchorRef={noopRegisterAnchorRef}
          renderStatus={message.status}
          onMessageMouseDown={noopMouseDown}
        />
      </CollapsibleDisclosure>
    ) : null;

  return (
    <section
      data-message-card
      className={`group relative cursor-text select-text ${isFixedPane ? "w-full min-w-0" : ""} ${messageClassName}`.trim()}
    >
      {reasoningDisclosure}
      <MessageContent
        windowId={windowId}
        message={message}
        anchorGroups={anchorGroups}
        className={contentClassName}
        isFocused={isFocused}
        registerAnchorRef={registerAnchorRef}
        onMessageMouseDown={onMessageMouseDown}
      />
      {isAssistant ? (
        <AssistantMessageFooter
          isComplete={message.status === "complete"}
          model={message.model}
          onRetry={() => onRetry(message.id)}
        />
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

export default ChatMessageCard;

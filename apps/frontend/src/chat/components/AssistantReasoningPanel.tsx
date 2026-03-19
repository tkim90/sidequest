import { memo, useMemo, useState } from "react";

import type { AnchorGroup, MessageRecord } from "../../types";
import MarkdownContent from "../markdown/MarkdownContent";
import CollapsibleDisclosure from "./CollapsibleDisclosure";

const EMPTY_ANCHORS: AnchorGroup[] = [];

function noopRegisterAnchorRef(): void {
  return undefined;
}

function noopMouseDown(): void {
  return undefined;
}

interface AssistantReasoningPanelProps {
  isFixedPane?: boolean;
  message: MessageRecord;
}

const AssistantReasoningPanel = memo(function AssistantReasoningPanel({
  isFixedPane = false,
  message,
}: AssistantReasoningPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayedReasoning =
    message.reasoningRawContent || message.reasoningSummaryContent;

  const reasoningMessage = useMemo(
    () => ({
      ...message,
      id: `${message.id}:reasoning`,
      content: displayedReasoning,
    }),
    [displayedReasoning, message],
  );

  if (!displayedReasoning) {
    return null;
  }

  return (
    <CollapsibleDisclosure
      buttonClassName="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
      buttonLabel="Reasoning"
      className={[
        "mb-4 border border-border",
        isFixedPane ? "bg-paper-raised/80" : "bg-secondary/65",
      ].join(" ")}
      contentClassName="border-t border-border px-4 py-4"
      isExpanded={isOpen}
      labelClassName="text-[12px] font-semibold uppercase tracking-[0.22em] text-muted-foreground"
      onToggle={() => setIsOpen((current) => !current)}
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
  );
});

export default AssistantReasoningPanel;

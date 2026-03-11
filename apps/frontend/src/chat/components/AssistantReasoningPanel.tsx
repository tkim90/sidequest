import { memo, useMemo, useState } from "react";

import type { AnchorGroup, MessageRecord } from "../../types";
import MarkdownContent from "../markdown/MarkdownContent";

const EMPTY_ANCHORS: AnchorGroup[] = [];

function noopRegisterAnchorRef(): void {
  return undefined;
}

function noopMouseDown(): void {
  return undefined;
}

interface AssistantReasoningPanelProps {
  message: MessageRecord;
}

const AssistantReasoningPanel = memo(function AssistantReasoningPanel({
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
    <section className="mb-4 border border-border bg-secondary/65">
      <button
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="text-[12px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Reasoning
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isOpen ? (
        <div className="border-t border-border px-4 py-4">
          <MarkdownContent
            windowId=""
            message={reasoningMessage}
            anchorGroups={EMPTY_ANCHORS}
            isFocused={false}
            className="text-[16px] leading-6 text-muted-foreground"
            registerAnchorRef={noopRegisterAnchorRef}
            renderStatus="complete"
            onMessageMouseDown={noopMouseDown}
          />
        </div>
      ) : null}
    </section>
  );
});

export default AssistantReasoningPanel;

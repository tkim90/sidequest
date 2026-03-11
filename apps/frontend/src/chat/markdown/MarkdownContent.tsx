import { memo, type MouseEvent as ReactMouseEvent } from "react";

import type { AnchorGroup, MessageRecord, MessageStatus } from "../../types";
import { computeBlockOffsets } from "./offsetMap";
import {
  FinalizedBlocksList,
  RenderActiveBlock,
  RenderFinalizedBlock,
} from "./BlockRenderers";
import { useIncrementalMarkdownParse } from "./useIncrementalMarkdownParse";

interface MarkdownContentProps {
  windowId: string;
  message: MessageRecord;
  anchorGroups: AnchorGroup[];
  isFocused: boolean;
  className?: string;
  hideStreamingChrome?: boolean;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  renderStatus?: MessageStatus;
  onMessageMouseDown: (
    event: ReactMouseEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
}

const MarkdownContent = memo(function MarkdownContent({
  windowId,
  message,
  anchorGroups,
  isFocused,
  className,
  hideStreamingChrome,
  registerAnchorRef,
  renderStatus,
  onMessageMouseDown,
}: MarkdownContentProps) {
  const status = renderStatus ?? message.status;
  const isComplete = status === "complete";
  const { finalizedBlocks, activeBlock } = useIncrementalMarkdownParse(
    message.content,
    message.id,
    isComplete,
  );

  const allBlocks = activeBlock
    ? [...finalizedBlocks, activeBlock]
    : finalizedBlocks;

  const hasContent = finalizedBlocks.length > 0 || activeBlock !== null;
  const showSkeleton =
    status === "streaming" && !hasContent && !hideStreamingChrome;
  const showStreamingCursor =
    status === "streaming" && !showSkeleton && !hideStreamingChrome;

  return (
    <div
      className={`cursor-text break-words text-[20px] leading-7 ${className ?? ""}`.trim()}
      data-message-id={message.id}
      onMouseDown={(event) => onMessageMouseDown(event, windowId, message.id)}
    >
      <FinalizedBlocksList
        allBlocks={allBlocks}
        anchorGroups={anchorGroups}
        blocks={finalizedBlocks}
        isFocused={isFocused}
        registerAnchorRef={registerAnchorRef}
      />
      {activeBlock ? (
        status === "streaming" ? (
          <RenderActiveBlock
            block={activeBlock}
            streamKey={`${message.id}:active`}
          />
        ) : (
          <RenderFinalizedBlock
            block={activeBlock}
            ctx={{
              anchorGroups,
              blockOffset: computeBlockOffsets(allBlocks)[allBlocks.length - 1],
              isFocused,
              registerAnchorRef,
            }}
          />
        )
      ) : null}
      {showSkeleton ? (
        <div className="animate-pulse space-y-3 py-1" aria-hidden="true">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <div className="h-4 w-2/5 rounded bg-muted" />
        </div>
      ) : null}
      {showStreamingCursor ? (
        <span className="ml-0.5 inline-block animate-pulse font-semibold" aria-hidden="true">
          |
        </span>
      ) : null}
    </div>
  );
}, areMarkdownContentPropsEqual);

function areMarkdownContentPropsEqual(
  previous: MarkdownContentProps,
  next: MarkdownContentProps,
): boolean {
  return (
    previous.windowId === next.windowId &&
    previous.message === next.message &&
    previous.anchorGroups === next.anchorGroups &&
    previous.isFocused === next.isFocused &&
    previous.className === next.className &&
    previous.hideStreamingChrome === next.hideStreamingChrome &&
    previous.renderStatus === next.renderStatus
  );
}

export default MarkdownContent;

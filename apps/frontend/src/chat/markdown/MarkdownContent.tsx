import { memo, type MouseEvent as ReactMouseEvent } from "react";

import type { AnchorGroup, MessageRecord } from "../../types";
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
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
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
  registerAnchorRef,
  onMessageMouseDown,
}: MarkdownContentProps) {
  const isComplete = message.status === "complete";
  const { finalizedBlocks, activeBlock } = useIncrementalMarkdownParse(
    message.content,
    message.id,
    isComplete,
  );

  const allBlocks = activeBlock
    ? [...finalizedBlocks, activeBlock]
    : finalizedBlocks;

  return (
    <div
      className="cursor-text break-words text-[20px] leading-7"
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
        message.status === "streaming" ? (
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
      {message.status === "streaming" ? (
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
    previous.isFocused === next.isFocused
  );
}

export default MarkdownContent;

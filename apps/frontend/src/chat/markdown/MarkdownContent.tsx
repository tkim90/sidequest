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

const SCRIBBLE_LINES = [
  {
    widthClassName: "w-[74%]",
    duration: "1.8s",
    delay: "0s",
    d: "M4 12 C 18 8, 32 15, 48 11 S 80 13, 98 11 S 130 13, 148 10 S 180 12, 202 11 S 238 12, 264 10",
  },
  {
    widthClassName: "w-full",
    duration: "2s",
    delay: "0.18s",
    d: "M3 12 C 22 10, 40 14, 58 11 S 92 13, 116 12 S 152 10, 176 12 S 210 14, 236 11 S 274 12, 312 11",
  },
  {
    widthClassName: "w-[82%]",
    duration: "1.9s",
    delay: "0.34s",
    d: "M4 12 C 16 9, 30 14, 46 12 S 78 11, 98 12 S 130 14, 154 11 S 188 13, 214 10 S 246 12, 272 11",
  },
  {
    widthClassName: "w-[40%]",
    duration: "1.65s",
    delay: "0.5s",
    d: "M4 12 C 18 10, 34 14, 52 11 S 82 13, 104 12 S 132 10, 150 11",
  },
] as const;

function StreamingScribbleSkeleton() {
  return (
    <div className="space-y-2 py-2" aria-hidden="true">
      {SCRIBBLE_LINES.map((line, index) => (
        <div key={`${line.delay}:${index}`} className={line.widthClassName}>
          <svg
            className="block h-4 w-full overflow-visible"
            viewBox="0 0 320 24"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d={line.d}
              pathLength={100}
              stroke="var(--paper-ink-soft)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.75"
              strokeWidth="2.4"
              style={{
                animation: `paper-scribble-loop ${line.duration} ease-out ${line.delay} infinite`,
                strokeDasharray: 100,
                strokeDashoffset: 100,
              }}
            />
          </svg>
        </div>
      ))}
    </div>
  );
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
        <StreamingScribbleSkeleton />
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

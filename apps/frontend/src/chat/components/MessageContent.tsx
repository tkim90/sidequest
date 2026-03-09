import {
  memo,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import type {
  AnchorGroup,
  MessageRecord,
} from "../../types";

interface MessageContentProps {
  windowId: string;
  message: MessageRecord;
  anchorGroups: AnchorGroup[];
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  onMessageMouseUp: (
    event: ReactMouseEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
}

interface IncrementalLineState {
  finalizedChunks: string[];
  activeChunk: string;
}

function splitIntoLineChunks(text: string): IncrementalLineState {
  if (text.length === 0) {
    return {
      finalizedChunks: [],
      activeChunk: "",
    };
  }

  const parts = text.split("\n");
  const activeChunk = parts.pop() ?? "";

  return {
    finalizedChunks: parts.map((line) => `${line}\n`),
    activeChunk,
  };
}

function IncrementalTokenText({
  text,
  streamKey,
}: {
  text: string;
  streamKey: string;
}) {
  const [tokens, setTokens] = useState<string[]>(text.length > 0 ? [text] : []);
  const prevTextRef = useRef(text);
  const prevKeyRef = useRef(streamKey);

  useLayoutEffect(() => {
    if (prevKeyRef.current !== streamKey) {
      prevKeyRef.current = streamKey;
      prevTextRef.current = text;
      setTokens(text.length > 0 ? [text] : []);
      return;
    }

    const previousText = prevTextRef.current;

    if (text.startsWith(previousText)) {
      const appended = text.slice(previousText.length);
      if (appended.length > 0) {
        setTokens((current) => [...current, appended]);
      }
    } else if (text !== previousText) {
      setTokens(text.length > 0 ? [text] : []);
    }

    prevTextRef.current = text;
  }, [streamKey, text]);

  return (
    <>
      {tokens.map((token, index) => (
        <span key={index}>{token}</span>
      ))}
    </>
  );
}

function useIncrementalLineChunks(
  text: string,
  streamKey: string,
): IncrementalLineState {
  const initialState = splitIntoLineChunks(text);
  const [finalizedChunks, setFinalizedChunks] = useState(
    initialState.finalizedChunks,
  );
  const [activeChunk, setActiveChunk] = useState(initialState.activeChunk);
  const prevTextRef = useRef(text);
  const prevKeyRef = useRef(streamKey);
  const activeChunkRef = useRef(initialState.activeChunk);

  useLayoutEffect(() => {
    if (prevKeyRef.current !== streamKey) {
      prevKeyRef.current = streamKey;
      prevTextRef.current = text;

      const resetState = splitIntoLineChunks(text);
      activeChunkRef.current = resetState.activeChunk;
      setFinalizedChunks(resetState.finalizedChunks);
      setActiveChunk(resetState.activeChunk);
      return;
    }

    const previousText = prevTextRef.current;

    if (text.startsWith(previousText)) {
      const appended = text.slice(previousText.length);

      if (appended.length > 0) {
        const nextFinalizedChunks: string[] = [];
        let nextActiveChunk = `${activeChunkRef.current}${appended}`;
        let newlineIndex = nextActiveChunk.indexOf("\n");

        while (newlineIndex >= 0) {
          nextFinalizedChunks.push(nextActiveChunk.slice(0, newlineIndex + 1));
          nextActiveChunk = nextActiveChunk.slice(newlineIndex + 1);
          newlineIndex = nextActiveChunk.indexOf("\n");
        }

        if (nextFinalizedChunks.length > 0) {
          setFinalizedChunks((current) => [...current, ...nextFinalizedChunks]);
        }

        if (nextActiveChunk !== activeChunkRef.current) {
          activeChunkRef.current = nextActiveChunk;
          setActiveChunk(nextActiveChunk);
        }
      }
    } else if (text !== previousText) {
      const resetState = splitIntoLineChunks(text);
      activeChunkRef.current = resetState.activeChunk;
      setFinalizedChunks(resetState.finalizedChunks);
      setActiveChunk(resetState.activeChunk);
    }

    prevTextRef.current = text;
  }, [streamKey, text]);

  return {
    finalizedChunks,
    activeChunk,
  };
}

function renderChunkContent({
  text,
  startOffset,
  chunkKey,
  anchorGroups,
  registerAnchorRef,
  useIncrementalTail,
}: {
  text: string;
  startOffset: number;
  chunkKey: string;
  anchorGroups: AnchorGroup[];
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  useIncrementalTail: boolean;
}): ReactNode[] {
  const endOffset = startOffset + text.length;
  const overlappingAnchors = anchorGroups.filter(
    (group) => group.startOffset < endOffset && group.endOffset > startOffset,
  );

  if (overlappingAnchors.length === 0) {
    return [
      useIncrementalTail ? (
        <IncrementalTokenText key={`${chunkKey}:tail`} text={text} streamKey={chunkKey} />
      ) : (
        <span key={`${chunkKey}:tail`}>{text}</span>
      ),
    ];
  }

  const nodes: ReactNode[] = [];
  let cursor = startOffset;

  overlappingAnchors.forEach((group) => {
    const chunkLocalStart = Math.max(group.startOffset, startOffset);
    const chunkLocalEnd = Math.min(group.endOffset, endOffset);

    if (cursor < chunkLocalStart) {
      const plainText = text.slice(
        cursor - startOffset,
        chunkLocalStart - startOffset,
      );

      nodes.push(
        <span key={`${chunkKey}:text:${cursor}`}>{plainText}</span>,
      );
    }

    const anchorText = text.slice(
      chunkLocalStart - startOffset,
      chunkLocalEnd - startOffset,
    );

    nodes.push(
      <span
        key={`${chunkKey}:anchor:${group.key}:${chunkLocalStart}`}
        className="border border-yellow-400 bg-yellow-200 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
        ref={(node) => registerAnchorRef(group.key, node)}
      >
        <span>{anchorText}</span>
        {group.anchorIds.length > 1 ? (
          <span className="ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-yellow-500 bg-yellow-50 px-1 align-middle text-[11px] font-semibold text-yellow-800">
            {group.anchorIds.length}
          </span>
        ) : null}
      </span>,
    );

    cursor = chunkLocalEnd;
  });

  if (cursor < endOffset) {
    const tailText = text.slice(cursor - startOffset);

    nodes.push(
      useIncrementalTail ? (
        <IncrementalTokenText
          key={`${chunkKey}:tail`}
          text={tailText}
          streamKey={`${chunkKey}:tail`}
        />
      ) : (
        <span key={`${chunkKey}:tail`}>{tailText}</span>
      ),
    );
  }

  return nodes;
}

const MessageContent = memo(function MessageContent({
  windowId,
  message,
  anchorGroups,
  registerAnchorRef,
  onMessageMouseUp,
}: MessageContentProps) {
  const { finalizedChunks, activeChunk } = useIncrementalLineChunks(
    message.content,
    message.id,
  );

  let offset = 0;
  const chunkNodes = finalizedChunks.flatMap((chunk, index) => {
    const chunkStartOffset = offset;
    offset += chunk.length;

    return renderChunkContent({
      text: chunk,
      startOffset: chunkStartOffset,
      chunkKey: `${message.id}:line:${index}`,
      anchorGroups,
      registerAnchorRef,
      useIncrementalTail: false,
    });
  });

  if (activeChunk.length > 0) {
    chunkNodes.push(
      ...renderChunkContent({
        text: activeChunk,
        startOffset: offset,
        chunkKey: `${message.id}:active`,
        anchorGroups,
        registerAnchorRef,
        useIncrementalTail: message.status === "streaming",
      }),
    );
  }

  return (
    <div
      className="cursor-text whitespace-pre-wrap break-words text-[20px] leading-7"
      data-message-id={message.id}
      onMouseUp={(event) => onMessageMouseUp(event, windowId, message.id)}
    >
      {chunkNodes}
      {message.status === "streaming" ? (
        <span className="ml-0.5 inline-block animate-pulse font-semibold" aria-hidden="true">
          |
        </span>
      ) : null}
    </div>
  );
}, areMessageContentPropsEqual);

function areMessageContentPropsEqual(
  previous: MessageContentProps,
  next: MessageContentProps,
): boolean {
  return (
    previous.windowId === next.windowId &&
    previous.message === next.message &&
    previous.anchorGroups === next.anchorGroups
  );
}

export default MessageContent;

import { useLayoutEffect, useRef, useState } from "react";

import { blocksEqual, createParserState, parseChunk } from "./parser";
import type { MarkdownBlock } from "./types";

interface MarkdownParseState {
  finalizedBlocks: MarkdownBlock[];
  activeBlock: MarkdownBlock | null;
}

export function useIncrementalMarkdownParse(
  content: string,
  messageId: string,
  isComplete: boolean,
): MarkdownParseState {
  const parserRef = useRef(createParserState());
  const blocksRef = useRef<MarkdownBlock[]>([]);
  const prevContentRef = useRef("");
  const prevMessageIdRef = useRef(messageId);

  const [finalizedBlocks, setFinalizedBlocks] = useState<MarkdownBlock[]>([]);
  const [activeBlock, setActiveBlock] = useState<MarkdownBlock | null>(null);

  useLayoutEffect(() => {
    if (prevMessageIdRef.current !== messageId) {
      prevMessageIdRef.current = messageId;
      prevContentRef.current = "";
      parserRef.current = createParserState();
      blocksRef.current = [];
    }

    const prevContent = prevContentRef.current;

    if (content.startsWith(prevContent)) {
      const delta = content.slice(prevContent.length);
      if (delta.length > 0 || isComplete) {
        const result = parseChunk(
          parserRef.current,
          blocksRef.current,
          delta,
          isComplete,
        );

        if (result.blocksChanged) {
          blocksRef.current = result.nextBlocks;
          setFinalizedBlocks(result.nextBlocks);
        }

        setActiveBlock((previous) =>
          blocksEqual(previous, result.activeBlock) ? previous : result.activeBlock,
        );
      }
    } else {
      parserRef.current = createParserState();
      blocksRef.current = [];

      const result = parseChunk(parserRef.current, [], content, isComplete);

      blocksRef.current = result.nextBlocks;
      setFinalizedBlocks(result.nextBlocks);
      setActiveBlock(result.activeBlock);
    }

    prevContentRef.current = content;
  }, [content, messageId, isComplete]);

  return { finalizedBlocks, activeBlock };
}

import {
  memo,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import type { AnchorGroup, MessageRecord } from "../../types";
import type { InlineNode, MarkdownBlock } from "./types";
import { createParserState, parseChunk, blocksEqual } from "./parser";
import { parseInlineMarkdown } from "./inlineParser";
import {
  computeBlockOffsets,
  flattenInlineLeaves,
  splitLeavesAtAnchors,
  getRenderedTextForInlineSource,
  type AnnotatedSpan,
  type BlockOffset,
} from "./offsetMap";
import CodeBlock from "./CodeBlock";

// --- Incremental token text (for streaming active block) ---

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

// --- Inline rendering with formatting ---

function renderFormattedSpan(span: AnnotatedSpan, key: string, registerAnchorRef?: (groupKey: string, node: HTMLSpanElement | null) => void, darkBackground?: boolean): ReactNode {
  let content: ReactNode = span.text;

  if (span.formatting.code) {
    content = (
      <code className="bg-zinc-200 px-1 py-0.5 rounded font-mono text-[0.9em]">
        {content}
      </code>
    );
  }
  if (span.formatting.em) {
    content = <em>{content}</em>;
  }
  if (span.formatting.strong) {
    content = <strong>{content}</strong>;
  }
  if (span.formatting.strike) {
    content = <del>{content}</del>;
  }
  if (span.formatting.link) {
    content = (
      <a
        href={span.formatting.link}
        target="_blank"
        rel="noreferrer noopener"
        className="text-blue-600 underline decoration-blue-500/70 underline-offset-2 hover:text-blue-500"
      >
        {content}
      </a>
    );
  }

  if (span.highlighted && span.anchorGroupKey) {
    const highlightClass = darkBackground
      ? "border border-yellow-500/60 bg-yellow-400/25 text-yellow-100 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
      : "border border-yellow-400 bg-yellow-200 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";
    const badgeClass = darkBackground
      ? "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-yellow-600/60 bg-yellow-900/40 px-1 align-middle text-[11px] font-semibold text-yellow-200"
      : "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-yellow-500 bg-yellow-50 px-1 align-middle text-[11px] font-semibold text-yellow-800";
    return (
      <span
        key={key}
        className={highlightClass}
        ref={registerAnchorRef ? (node) => registerAnchorRef(span.anchorGroupKey!, node) : undefined}
      >
        <span>{content}</span>
        {span.anchorCount && span.anchorCount > 1 ? (
          <span className={badgeClass}>
            {span.anchorCount}
          </span>
        ) : null}
      </span>
    );
  }

  return <span key={key}>{content}</span>;
}

function renderInlineNodes(nodes: InlineNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}:${index}`;

    if (node.type === "text") {
      return <span key={key}>{node.text}</span>;
    }

    if (node.type === "code") {
      return (
        <code
          key={key}
          className="bg-zinc-200 px-1 py-0.5 rounded font-mono text-[0.9em]"
        >
          {node.text}
        </code>
      );
    }

    if (node.type === "strong") {
      return <strong key={key}>{renderInlineNodes(node.children, `${key}:s`)}</strong>;
    }

    if (node.type === "em") {
      return <em key={key}>{renderInlineNodes(node.children, `${key}:e`)}</em>;
    }

    if (node.type === "strike") {
      return <del key={key}>{renderInlineNodes(node.children, `${key}:d`)}</del>;
    }

    if (node.type === "link") {
      const children =
        node.children.length > 0
          ? renderInlineNodes(node.children, `${key}:l`)
          : node.href;

      return (
        <a
          key={key}
          href={node.href}
          target="_blank"
          rel="noreferrer noopener"
          className="text-blue-600 underline decoration-blue-500/70 underline-offset-2 hover:text-blue-500"
        >
          {children}
        </a>
      );
    }

    return null;
  });
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  return renderInlineNodes(parseInlineMarkdown(text), keyPrefix);
}

// --- Block rendering with anchor highlight support ---

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

const headingTagByLevel: Record<HeadingLevel, HeadingTag> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
};

const headingSizeClassByLevel: Record<HeadingLevel, string> = {
  1: "text-2xl",
  2: "text-xl",
  3: "text-lg",
  4: "text-base",
  5: "text-sm",
  6: "text-sm",
};

interface BlockRenderContext {
  anchorGroups: AnchorGroup[];
  blockOffset: BlockOffset;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
}

function getBlockAnchorRanges(ctx: BlockRenderContext) {
  const { anchorGroups, blockOffset } = ctx;
  return anchorGroups
    .filter(
      (g) => g.startOffset < blockOffset.renderedEnd && g.endOffset > blockOffset.renderedStart,
    )
    .map((g) => ({
      key: g.key,
      startOffset: Math.max(g.startOffset, blockOffset.renderedStart) - blockOffset.renderedStart,
      endOffset: Math.min(g.endOffset, blockOffset.renderedEnd) - blockOffset.renderedStart,
      count: g.anchorIds.length,
    }));
}

function renderInlineTextWithAnchors(
  text: string,
  blockLocalOffset: number,
  keyPrefix: string,
  anchors: { key: string; startOffset: number; endOffset: number; count: number }[],
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void,
): ReactNode[] {
  const nodes = parseInlineMarkdown(text);
  const leaves = flattenInlineLeaves(nodes, blockLocalOffset);
  const annotated = splitLeavesAtAnchors(leaves, anchors, 0);
  return annotated.map((span, i) =>
    renderFormattedSpan(span, `${keyPrefix}:${i}`, registerAnchorRef),
  );
}

function renderCodeBlockWithAnchors(
  code: string,
  blockLocalOffset: number,
  keyPrefix: string,
  anchors: { key: string; startOffset: number; endOffset: number; count: number }[],
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void,
): ReactNode[] {
  // Code blocks: no inline parsing, treat as plain text leaves
  if (anchors.length === 0) {
    return [<span key={`${keyPrefix}:code`}>{code}</span>];
  }

  const leaves = [{ text: code, start: blockLocalOffset, end: blockLocalOffset + code.length, formatting: {} }];
  const annotated = splitLeavesAtAnchors(leaves, anchors, 0);
  return annotated.map((span, i) =>
    renderFormattedSpan(span, `${keyPrefix}:${i}`, registerAnchorRef, true),
  );
}

function renderListItemsWithAnchors(
  items: string[],
  itemBaseOffset: number,
  keyPrefix: string,
  anchors: { key: string; startOffset: number; endOffset: number; count: number }[],
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void,
): ReactNode[] {
  let cursor = itemBaseOffset;
  return items.map((item, index) => {
    const renderedItem = getRenderedTextForInlineSource(item);
    const itemStart = cursor;
    cursor += renderedItem.length + (index < items.length - 1 ? 1 : 0); // +1 for \n between items

    const itemAnchors = anchors
      .filter((a) => a.startOffset < itemStart + renderedItem.length && a.endOffset > itemStart)
      .map((a) => ({
        ...a,
        startOffset: Math.max(a.startOffset, itemStart) - itemStart,
        endOffset: Math.min(a.endOffset, itemStart + renderedItem.length) - itemStart,
      }));

    const content = renderInlineTextWithAnchors(
      item,
      0,
      `${keyPrefix}:li:${index}`,
      itemAnchors,
      registerAnchorRef,
    );

    return (
      <li key={index} className="leading-7">
        {content}
      </li>
    );
  });
}

function RenderFinalizedBlock({
  block,
  ctx,
}: {
  block: MarkdownBlock;
  ctx: BlockRenderContext;
}) {
  const anchors = getBlockAnchorRanges(ctx);
  const keyPrefix = `blk:${block.id}`;

  if (block.type === "header") {
    const HeadingTag = headingTagByLevel[block.level];
    const content = renderInlineTextWithAnchors(
      block.text,
      0,
      keyPrefix,
      anchors,
      ctx.registerAnchorRef,
    );
    return (
      <div className="my-3">
        <HeadingTag
          className={`${headingSizeClassByLevel[block.level]} font-semibold leading-tight tracking-tight`}
        >
          {content}
        </HeadingTag>
      </div>
    );
  }

  if (block.type === "code") {
    // Fall back to plain-text rendering when anchor highlights overlap
    if (anchors.length > 0) {
      const content = renderCodeBlockWithAnchors(
        block.code,
        0,
        keyPrefix,
        anchors,
        ctx.registerAnchorRef,
      );
      return (
        <div className="my-3">
          <div className="overflow-x-auto rounded-md bg-zinc-900 text-zinc-100">
            {block.language ? (
              <div className="border-b border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                {block.language}
              </div>
            ) : null}
            <pre className="p-3 text-sm leading-6 font-mono">
              <code>{content}</code>
            </pre>
          </div>
        </div>
      );
    }
    return <CodeBlock code={block.code} language={block.language} />;
  }

  if (block.type === "blockquote") {
    const content = renderInlineTextWithAnchors(
      block.text,
      0,
      keyPrefix,
      anchors,
      ctx.registerAnchorRef,
    );
    return (
      <div className="my-3">
        <blockquote className="whitespace-pre-wrap border-l-4 border-zinc-300 pl-4 italic leading-7 text-zinc-600">
          {content}
        </blockquote>
      </div>
    );
  }

  if (block.type === "unordered_list") {
    const listItems = renderListItemsWithAnchors(
      block.items,
      0,
      keyPrefix,
      anchors,
      ctx.registerAnchorRef,
    );
    return (
      <div className="my-3">
        <ul className="list-disc pl-6 space-y-1">
          {listItems}
        </ul>
      </div>
    );
  }

  if (block.type === "ordered_list") {
    // For ordered lists, adapt the interface
    let cursor = 0;
    const itemElements = block.items.map((item, index) => {
      const renderedItem = getRenderedTextForInlineSource(item.text);
      const itemStart = cursor;
      cursor += renderedItem.length + (index < block.items.length - 1 ? 1 : 0);

      const itemAnchors = anchors
        .filter((a) => a.startOffset < itemStart + renderedItem.length && a.endOffset > itemStart)
        .map((a) => ({
          ...a,
          startOffset: Math.max(a.startOffset, itemStart) - itemStart,
          endOffset: Math.min(a.endOffset, itemStart + renderedItem.length) - itemStart,
        }));

      const content = renderInlineTextWithAnchors(
        item.text,
        0,
        `${keyPrefix}:oli:${index}`,
        itemAnchors,
        ctx.registerAnchorRef,
      );

      return (
        <li key={index} value={item.index} className="leading-7">
          {content}
        </li>
      );
    });

    return (
      <div className="my-3">
        <ol className="list-decimal pl-6 space-y-1">
          {itemElements}
        </ol>
      </div>
    );
  }

  // paragraph
  const content = renderInlineTextWithAnchors(
    block.text,
    0,
    keyPrefix,
    anchors,
    ctx.registerAnchorRef,
  );
  return (
    <div className="my-3">
      <p className="whitespace-pre-wrap leading-7">
        {content}
      </p>
    </div>
  );
}

// --- Active (streaming) block rendering ---

function renderActiveBlockText(block: MarkdownBlock, streamKey: string): ReactNode {
  const text =
    block.type === "code"
      ? block.code
      : block.type === "unordered_list"
        ? block.items.join("\n")
        : block.type === "ordered_list"
          ? block.items.map((item) => item.text).join("\n")
          : block.text;

  return <IncrementalTokenText text={text} streamKey={streamKey} />;
}

function RenderActiveBlock({
  block,
  streamKey,
}: {
  block: MarkdownBlock;
  streamKey: string;
}) {
  if (block.type === "header") {
    const HeadingTag = headingTagByLevel[block.level];
    return (
      <div className="my-3">
        <HeadingTag
          className={`${headingSizeClassByLevel[block.level]} font-semibold leading-tight tracking-tight`}
        >
          {renderActiveBlockText(block, streamKey)}
        </HeadingTag>
      </div>
    );
  }

  if (block.type === "code") {
    return <CodeBlock code={block.code} language={block.language} />;
  }

  if (block.type === "blockquote") {
    return (
      <div className="my-3">
        <blockquote className="whitespace-pre-wrap border-l-4 border-zinc-300 pl-4 italic leading-7 text-zinc-600">
          {renderActiveBlockText(block, streamKey)}
        </blockquote>
      </div>
    );
  }

  if (block.type === "unordered_list") {
    return (
      <div className="my-3">
        <ul className="list-disc pl-6 space-y-1">
          {block.items.map((item, index) => (
            <li key={index} className="leading-7">
              {index === block.items.length - 1 ? (
                <IncrementalTokenText text={item} streamKey={`${streamKey}:ul:${index}`} />
              ) : (
                <span>{item}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (block.type === "ordered_list") {
    return (
      <div className="my-3">
        <ol className="list-decimal pl-6 space-y-1">
          {block.items.map((item, index) => (
            <li key={index} value={item.index} className="leading-7">
              {index === block.items.length - 1 ? (
                <IncrementalTokenText text={item.text} streamKey={`${streamKey}:ol:${index}`} />
              ) : (
                <span>{item.text}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // paragraph
  return (
    <div className="my-3">
      <p className="whitespace-pre-wrap leading-7">
        {renderActiveBlockText(block, streamKey)}
      </p>
    </div>
  );
}

// --- Memoized finalized blocks list ---

const FinalizedBlocksList = memo(function FinalizedBlocksList({
  blocks,
  allBlocks,
  anchorGroups,
  registerAnchorRef,
}: {
  blocks: MarkdownBlock[];
  allBlocks: MarkdownBlock[];
  anchorGroups: AnchorGroup[];
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
}) {
  const blockOffsets = computeBlockOffsets(allBlocks);

  return (
    <>
      {blocks.map((block, index) => {
        const offsetEntry = blockOffsets[index];
        if (!offsetEntry) return null;

        return (
          <RenderFinalizedBlock
            key={block.id}
            block={block}
            ctx={{
              anchorGroups,
              blockOffset: offsetEntry,
              registerAnchorRef,
            }}
          />
        );
      })}
    </>
  );
});

// --- Incremental markdown parsing hook ---

interface MarkdownParseState {
  finalizedBlocks: MarkdownBlock[];
  activeBlock: MarkdownBlock | null;
}

function useIncrementalMarkdownParse(
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
    // Reset on new message
    if (prevMessageIdRef.current !== messageId) {
      prevMessageIdRef.current = messageId;
      prevContentRef.current = "";
      parserRef.current = createParserState();
      blocksRef.current = [];
    }

    const prevContent = prevContentRef.current;

    if (content.startsWith(prevContent)) {
      // Append-only: incremental parse
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

        setActiveBlock((prev) =>
          blocksEqual(prev, result.activeBlock) ? prev : result.activeBlock,
        );
      }
    } else {
      // Non-append change: full re-parse
      parserRef.current = createParserState();
      blocksRef.current = [];

      const result = parseChunk(
        parserRef.current,
        [],
        content,
        isComplete,
      );

      blocksRef.current = result.nextBlocks;
      setFinalizedBlocks(result.nextBlocks);
      setActiveBlock(result.activeBlock);
    }

    prevContentRef.current = content;
  }, [content, messageId, isComplete]);

  return { finalizedBlocks, activeBlock };
}

// --- Main component ---

interface MarkdownContentProps {
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

const MarkdownContent = memo(function MarkdownContent({
  windowId,
  message,
  anchorGroups,
  registerAnchorRef,
  onMessageMouseUp,
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
      onMouseUp={(event) => onMessageMouseUp(event, windowId, message.id)}
    >
      <FinalizedBlocksList
        blocks={finalizedBlocks}
        allBlocks={allBlocks}
        anchorGroups={anchorGroups}
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
    previous.anchorGroups === next.anchorGroups
  );
}

export default MarkdownContent;

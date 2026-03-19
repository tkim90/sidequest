import { memo, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import type { AnchorGroup } from "../../types";
import ImageRenderer, { ImageRendererSkeleton } from "../jsonrender/ImageRenderer";
import { mergeJsonRenderSpec } from "../jsonrender/mergeSpec";
import { partialJsonParse, tryParseSpec } from "../jsonrender/partialJsonParse";
import registry from "../jsonrender/registry";
import SpecRenderer, { SpecRendererSkeleton } from "../jsonrender/SpecRenderer";
import type { JsonRenderSpec } from "../jsonrender/types";
import CodeBlock from "./CodeBlock";
import {
  computeBlockOffsets,
  getRenderedTextForInlineSource,
  type BlockOffset,
} from "./offsetMap";
import {
  renderAnchoredInlineSource,
  renderInlineMarkdown,
  type AnchorRange,
} from "./renderInlineAnchors";
import type { MarkdownBlock } from "./types";

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

export interface BlockRenderContext {
  anchorGroups: AnchorGroup[];
  blockOffset: BlockOffset;
  isFocused: boolean;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
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

function StreamingJsonRenderBlock({
  code,
  streamKey,
}: {
  code: string;
  streamKey: string;
}) {
  const [stableSpec, setStableSpec] = useState<JsonRenderSpec | null>(() =>
    partialJsonParse(code),
  );
  const prevKeyRef = useRef(streamKey);

  useEffect(() => {
    if (prevKeyRef.current !== streamKey) {
      prevKeyRef.current = streamKey;
      setStableSpec(partialJsonParse(code));
      return;
    }

    const parsedSpec = partialJsonParse(code);
    if (!parsedSpec) {
      return;
    }

    setStableSpec((previous) => mergeJsonRenderSpec(previous, parsedSpec));
  }, [code, streamKey]);

  if (!stableSpec) {
    return <SpecRendererSkeleton />;
  }

  return <SpecRenderer spec={stableSpec} registry={registry} partial rawJson={code} />;
}

function StreamingImageRenderBlock({
  code,
  streamKey,
}: {
  code: string;
  streamKey: string;
}) {
  const [stableSpec, setStableSpec] = useState<JsonRenderSpec | null>(() =>
    partialJsonParse(code),
  );
  const prevKeyRef = useRef(streamKey);

  useLayoutEffect(() => {
    if (prevKeyRef.current !== streamKey) {
      prevKeyRef.current = streamKey;
      setStableSpec(partialJsonParse(code));
      return;
    }

    const parsedSpec = partialJsonParse(code);
    if (!parsedSpec) return;

    setStableSpec(parsedSpec);
  }, [code, streamKey]);

  if (!stableSpec) {
    return <ImageRendererSkeleton />;
  }

  return <ImageRenderer spec={stableSpec} partial rawJson={code} />;
}

function getBlockAnchorRanges(ctx: BlockRenderContext): AnchorRange[] {
  const { anchorGroups, blockOffset } = ctx;
  return anchorGroups
    .filter(
      (group) =>
        group.startOffset < blockOffset.renderedEnd &&
        group.endOffset > blockOffset.renderedStart,
    )
    .map((group) => ({
      key: group.key,
      startOffset:
        Math.max(group.startOffset, blockOffset.renderedStart) -
        blockOffset.renderedStart,
      endOffset:
        Math.min(group.endOffset, blockOffset.renderedEnd) -
        blockOffset.renderedStart,
      count: group.anchorIds.length,
      preview: group.preview,
    }));
}

function renderListItems(
  items: string[],
  anchors: AnchorRange[],
  keyPrefix: string,
  registerAnchorRef: BlockRenderContext["registerAnchorRef"],
  isFocused: boolean,
): ReactNode[] {
  let cursor = 0;

  return items.map((item, index) => {
    const content = renderAnchoredInlineSource({
      anchors,
      isFocused,
      keyPrefix: `${keyPrefix}:li:${index}`,
      registerAnchorRef,
      sourceStart: cursor,
      text: item,
    });
    cursor +=
      getRenderedTextForInlineSource(item).length +
      (index < items.length - 1 ? 1 : 0);

    return (
      <li key={index} className="leading-7">
        {content}
      </li>
    );
  });
}

function renderOrderedListItems(
  items: Array<{ index: number; text: string }>,
  anchors: AnchorRange[],
  keyPrefix: string,
  registerAnchorRef: BlockRenderContext["registerAnchorRef"],
  isFocused: boolean,
): ReactNode[] {
  let cursor = 0;

  return items.map((item, index) => {
    const content = renderAnchoredInlineSource({
      anchors,
      isFocused,
      keyPrefix: `${keyPrefix}:oli:${index}`,
      registerAnchorRef,
      sourceStart: cursor,
      text: item.text,
    });
    cursor +=
      getRenderedTextForInlineSource(item.text).length +
      (index < items.length - 1 ? 1 : 0);

    return (
      <li key={index} value={item.index} className="leading-7">
        {content}
      </li>
    );
  });
}

function renderTableCells(
  rows: string[][],
  alignments: string[],
  anchors: AnchorRange[],
  keyPrefix: string,
  registerAnchorRef: BlockRenderContext["registerAnchorRef"],
  isFocused: boolean,
  cellTag: "th" | "td",
  rowOffset: number,
) {
  let cursor = rowOffset;

  return rows.map((row, rowIndex) => {
    let cellCursor = cursor;

    const cells = row.map((cell, cellIndex) => {
      const Tag = cellTag;
      const content = renderAnchoredInlineSource({
        anchors,
        isFocused,
        keyPrefix: `${keyPrefix}:${cellTag}:${rowIndex}:${cellIndex}`,
        registerAnchorRef,
        sourceStart: cellCursor,
        text: cell,
      });
      cellCursor +=
        getRenderedTextForInlineSource(cell).length +
        (cellIndex < row.length - 1 ? 1 : 0);

      return (
        <Tag
          key={cellIndex}
          className={`px-3 py-2 ${
            cellTag === "th" ? "font-semibold " : ""
          }${
            alignments[cellIndex] === "center"
              ? "text-center"
              : alignments[cellIndex] === "right"
                ? "text-right"
                : "text-left"
          }`}
        >
          {content}
        </Tag>
      );
    });

    cursor = cellCursor + (rowIndex < rows.length - 1 ? 1 : 0);

    return (
      <tr key={rowIndex} className="border-b border-border">
        {cells}
      </tr>
    );
  });
}

export function RenderFinalizedBlock({
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
    return (
      <div className="my-3">
        <HeadingTag
          className={`${headingSizeClassByLevel[block.level]} font-semibold leading-tight tracking-tight`}
        >
          {renderAnchoredInlineSource({
            anchors,
            isFocused: ctx.isFocused,
            keyPrefix,
            registerAnchorRef: ctx.registerAnchorRef,
            sourceStart: 0,
            text: block.text,
          })}
        </HeadingTag>
      </div>
    );
  }

  if (block.type === "code" && block.language === "jsonrender") {
    const spec = tryParseSpec(block.code);
    if (spec) {
      return <SpecRenderer spec={spec} registry={registry} rawJson={block.code} />;
    }
    return (
      <div className="my-3">
        <div className="flex items-center gap-1.5 rounded-t-md bg-destructive/10 border border-b-0 border-destructive/20 px-3 py-1.5 text-xs text-destructive">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM7.25 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5ZM8 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
          </svg>
          Failed to render UI — invalid JSON
        </div>
        <CodeBlock code={block.code} language="json" />
      </div>
    );
  }

  if (block.type === "code" && block.language === "imagerender") {
    const spec = tryParseSpec(block.code);
    if (spec) {
      return <ImageRenderer spec={spec} rawJson={block.code} />;
    }
    return (
      <div className="my-3">
        <div className="flex items-center gap-1.5 rounded-t-md bg-destructive/10 border border-b-0 border-destructive/20 px-3 py-1.5 text-xs text-destructive">
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM7.25 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5ZM8 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
          </svg>
          Failed to render image — invalid JSON
        </div>
        <CodeBlock code={block.code} language="json" />
      </div>
    );
  }

  if (block.type === "code") {
    return (
      <CodeBlock
        code={block.code}
        language={block.language}
        anchorRanges={anchors}
        isFocused={ctx.isFocused}
        registerAnchorRef={ctx.registerAnchorRef}
      />
    );
  }

  if (block.type === "blockquote") {
    return (
      <div className="my-3">
        <blockquote className="whitespace-pre-wrap border-l-4 border-border pl-4 italic leading-7 text-muted-foreground">
          {renderAnchoredInlineSource({
            anchors,
            isFocused: ctx.isFocused,
            keyPrefix,
            registerAnchorRef: ctx.registerAnchorRef,
            sourceStart: 0,
            text: block.text,
          })}
        </blockquote>
      </div>
    );
  }

  if (block.type === "unordered_list") {
    return (
      <div className="my-3">
        <ul className="list-disc space-y-1">
          {renderListItems(
            block.items,
            anchors,
            keyPrefix,
            ctx.registerAnchorRef,
            ctx.isFocused,
          )}
        </ul>
      </div>
    );
  }

  if (block.type === "ordered_list") {
    return (
      <div className="my-3">
        <ol className="list-decimal space-y-1">
          {renderOrderedListItems(
            block.items,
            anchors,
            keyPrefix,
            ctx.registerAnchorRef,
            ctx.isFocused,
          )}
        </ol>
      </div>
    );
  }

  if (block.type === "table") {
    const headerRow = renderTableCells(
      [block.headers],
      block.alignments,
      anchors,
      keyPrefix,
      ctx.registerAnchorRef,
      ctx.isFocused,
      "th",
      0,
    );

    const firstRowOffset =
      block.headers
        .map((header) => getRenderedTextForInlineSource(header))
        .join("\t").length + 1;

    return (
      <div className="my-3 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>{headerRow}</thead>
          <tbody>
            {renderTableCells(
              block.rows,
              block.alignments,
              anchors,
              keyPrefix,
              ctx.registerAnchorRef,
              ctx.isFocused,
              "td",
              firstRowOffset,
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <p className="my-2 whitespace-pre-wrap leading-7">
      {renderAnchoredInlineSource({
        anchors,
        isFocused: ctx.isFocused,
        keyPrefix,
        registerAnchorRef: ctx.registerAnchorRef,
        sourceStart: 0,
        text: block.text,
      })}
    </p>
  );
}

function renderActiveBlockText(block: MarkdownBlock, streamKey: string): ReactNode {
  const text =
    block.type === "code"
      ? block.code
      : block.type === "unordered_list"
        ? block.items.join("\n")
        : block.type === "ordered_list"
          ? block.items.map((item) => item.text).join("\n")
          : block.type === "table"
            ? [block.headers.join("\t"), ...block.rows.map((row) => row.join("\t"))].join("\n")
            : block.text;

  return <IncrementalTokenText text={text} streamKey={streamKey} />;
}

export function RenderActiveBlock({
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

  if (block.type === "code" && block.language === "jsonrender") {
    return <StreamingJsonRenderBlock code={block.code} streamKey={streamKey} />;
  }

  if (block.type === "code" && block.language === "imagerender") {
    return <StreamingImageRenderBlock code={block.code} streamKey={streamKey} />;
  }

  if (block.type === "code") {
    return <CodeBlock code={block.code} language={block.language} />;
  }

  if (block.type === "blockquote") {
    return (
      <div className="my-3">
        <blockquote className="whitespace-pre-wrap border-l-4 border-border italic leading-7 text-muted-foreground">
          {renderActiveBlockText(block, streamKey)}
        </blockquote>
      </div>
    );
  }

  if (block.type === "unordered_list") {
    return (
      <div className="my-3">
        <ul className="list-disc space-y-1">
          {block.items.map((item, index) => (
            <li key={index} className="leading-7">
              {index === block.items.length - 1 ? (
                <IncrementalTokenText
                  text={item}
                  streamKey={`${streamKey}:ul:${index}`}
                />
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
        <ol className="list-decimal space-y-1">
          {block.items.map((item, index) => (
            <li key={index} value={item.index} className="leading-7">
              {index === block.items.length - 1 ? (
                <IncrementalTokenText
                  text={item.text}
                  streamKey={`${streamKey}:ol:${index}`}
                />
              ) : (
                <span>{item.text}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (block.type === "table") {
    const lastRowIndex = block.rows.length - 1;
    const lastCellIndex =
      lastRowIndex >= 0 ? block.rows[lastRowIndex].length - 1 : -1;

    return (
      <div className="my-3 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {block.headers.map((header, index) => (
                <th
                  key={index}
                  className={`px-3 py-2 font-semibold ${
                    block.alignments[index] === "center"
                      ? "text-center"
                      : block.alignments[index] === "right"
                        ? "text-right"
                        : "text-left"
                  }`}
                >
                  {renderInlineMarkdown(header, `active:th:${index}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-3 py-2 ${
                      block.alignments[cellIndex] === "center"
                        ? "text-center"
                        : block.alignments[cellIndex] === "right"
                          ? "text-right"
                          : "text-left"
                    }`}
                  >
                    {rowIndex === lastRowIndex && cellIndex === lastCellIndex ? (
                      <IncrementalTokenText
                        text={cell}
                        streamKey={`${streamKey}:td:${rowIndex}:${cellIndex}`}
                      />
                    ) : (
                      renderInlineMarkdown(
                        cell,
                        `active:td:${rowIndex}:${cellIndex}`,
                      )
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="my-3">
      <p className="whitespace-pre-wrap leading-7">
        {renderActiveBlockText(block, streamKey)}
      </p>
    </div>
  );
}

export const FinalizedBlocksList = memo(function FinalizedBlocksList({
  allBlocks,
  anchorGroups,
  blocks,
  isFocused,
  registerAnchorRef,
}: {
  allBlocks: MarkdownBlock[];
  anchorGroups: AnchorGroup[];
  blocks: MarkdownBlock[];
  isFocused: boolean;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
}) {
  const blockOffsets = computeBlockOffsets(allBlocks);

  return (
    <>
      {blocks.map((block, index) => {
        const blockOffset = blockOffsets[index];
        if (!blockOffset) {
          return null;
        }

        return (
          <RenderFinalizedBlock
            key={block.id}
            block={block}
            ctx={{
              anchorGroups,
              blockOffset,
              isFocused,
              registerAnchorRef,
            }}
          />
        );
      })}
    </>
  );
});

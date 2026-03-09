import { memo, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import type { AnchorGroup } from "../../types";
import CodeBlock from "./CodeBlock";
import {
  computeBlockOffsets,
  getRenderedTextForInlineSource,
  type BlockOffset,
} from "./offsetMap";
import {
  renderAnchoredInlineSource,
  renderAnchoredPlainText,
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
      <tr key={rowIndex} className="border-b border-zinc-200">
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

  if (block.type === "code") {
    if (anchors.length === 0) {
      return <CodeBlock code={block.code} language={block.language} />;
    }

    return (
      <div className="my-3">
        <div className="overflow-x-auto rounded-md bg-zinc-900 text-zinc-100">
          {block.language ? (
            <div className="border-b border-zinc-700 px-3 py-1 text-xs text-zinc-300">
              {block.language}
            </div>
          ) : null}
          <pre className="p-3 font-mono text-sm leading-6">
            <code>
              {renderAnchoredPlainText({
                anchors,
                darkBackground: true,
                isFocused: ctx.isFocused,
                keyPrefix,
                registerAnchorRef: ctx.registerAnchorRef,
                text: block.code,
              })}
            </code>
          </pre>
        </div>
      </div>
    );
  }

  if (block.type === "blockquote") {
    return (
      <div className="my-3">
        <blockquote className="whitespace-pre-wrap border-l-4 border-zinc-300 pl-4 italic leading-7 text-zinc-600">
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
        <ul className="list-disc space-y-1 pl-6">
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
        <ol className="list-decimal space-y-1 pl-6">
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
    <div className="my-3">
      <p className="whitespace-pre-wrap leading-7">
        {renderAnchoredInlineSource({
          anchors,
          isFocused: ctx.isFocused,
          keyPrefix,
          registerAnchorRef: ctx.registerAnchorRef,
          sourceStart: 0,
          text: block.text,
        })}
      </p>
    </div>
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
        <ul className="list-disc space-y-1 pl-6">
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
        <ol className="list-decimal space-y-1 pl-6">
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
            <tr className="border-b border-zinc-300">
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
              <tr key={rowIndex} className="border-b border-zinc-200">
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

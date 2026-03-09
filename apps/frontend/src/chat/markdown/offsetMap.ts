import type { InlineNode, MarkdownBlock } from "./types";
import { parseInlineMarkdown } from "./inlineParser";

export interface BlockOffset {
  blockIndex: number;
  renderedStart: number;
  renderedEnd: number;
}

export interface LeafSpan {
  text: string;
  start: number;
  end: number;
  formatting: LeafFormatting;
}

export interface LeafFormatting {
  strong?: boolean;
  em?: boolean;
  strike?: boolean;
  code?: boolean;
  link?: string;
}

export interface AnnotatedSpan extends LeafSpan {
  highlighted: boolean;
  anchorGroupKey?: string;
  anchorCount?: number;
}

export function getRenderedTextForBlock(block: MarkdownBlock): string {
  switch (block.type) {
    case "header":
      return getRenderedTextForInlineSource(block.text);
    case "paragraph":
      return getRenderedTextForInlineSource(block.text);
    case "blockquote":
      return getRenderedTextForInlineSource(block.text);
    case "code":
      return block.code;
    case "unordered_list":
      return block.items.map((item) => getRenderedTextForInlineSource(item)).join("\n");
    case "ordered_list":
      return block.items
        .map((item) => getRenderedTextForInlineSource(item.text))
        .join("\n");
    case "table":
      return [
        block.headers.map((cell) => getRenderedTextForInlineSource(cell)).join("\t"),
        ...block.rows.map((row) =>
          row.map((cell) => getRenderedTextForInlineSource(cell)).join("\t"),
        ),
      ].join("\n");
  }
}

function getInlineRenderedText(nodes: InlineNode[]): string {
  let result = "";
  for (const node of nodes) {
    if (node.type === "text") {
      result += node.text;
    } else if (node.type === "code") {
      result += node.text;
    } else if (node.type === "link") {
      result += getInlineRenderedText(node.children);
    } else {
      result += getInlineRenderedText(node.children);
    }
  }
  return result;
}

export function getRenderedTextForInlineSource(source: string): string {
  const nodes = parseInlineMarkdown(source);
  return getInlineRenderedText(nodes);
}

export function computeBlockOffsets(blocks: MarkdownBlock[]): BlockOffset[] {
  const offsets: BlockOffset[] = [];
  let cursor = 0;

  for (let i = 0; i < blocks.length; i += 1) {
    const renderedText = getRenderedTextForBlock(blocks[i]);

    const start = cursor;
    const end = cursor + renderedText.length;

    offsets.push({
      blockIndex: i,
      renderedStart: start,
      renderedEnd: end,
    });

    cursor = end + 1; // +1 for \n separator between blocks
  }

  return offsets;
}

export function flattenInlineLeaves(
  nodes: InlineNode[],
  baseOffset: number,
  parentFormatting: LeafFormatting = {},
): LeafSpan[] {
  const leaves: LeafSpan[] = [];
  let cursor = baseOffset;

  for (const node of nodes) {
    if (node.type === "text") {
      if (node.text.length > 0) {
        leaves.push({
          text: node.text,
          start: cursor,
          end: cursor + node.text.length,
          formatting: { ...parentFormatting },
        });
        cursor += node.text.length;
      }
    } else if (node.type === "code") {
      if (node.text.length > 0) {
        leaves.push({
          text: node.text,
          start: cursor,
          end: cursor + node.text.length,
          formatting: { ...parentFormatting, code: true },
        });
        cursor += node.text.length;
      }
    } else if (node.type === "link") {
      const childFormatting = { ...parentFormatting, link: node.href };
      const childLeaves = flattenInlineLeaves(node.children, cursor, childFormatting);
      leaves.push(...childLeaves);
      const childLength = childLeaves.reduce((sum, leaf) => sum + leaf.text.length, 0);
      cursor += childLength;
    } else {
      // strong, em, strike
      const childFormatting = { ...parentFormatting };
      if (node.type === "strong") childFormatting.strong = true;
      if (node.type === "em") childFormatting.em = true;
      if (node.type === "strike") childFormatting.strike = true;

      const childLeaves = flattenInlineLeaves(node.children, cursor, childFormatting);
      leaves.push(...childLeaves);
      const childLength = childLeaves.reduce((sum, leaf) => sum + leaf.text.length, 0);
      cursor += childLength;
    }
  }

  return leaves;
}

interface AnchorRange {
  key: string;
  startOffset: number;
  endOffset: number;
  count: number;
}

export function splitLeavesAtAnchors(
  leaves: LeafSpan[],
  anchors: AnchorRange[],
): AnnotatedSpan[] {
  if (anchors.length === 0) {
    return leaves.map((leaf) => ({
      ...leaf,
      highlighted: false,
    }));
  }

  const result: AnnotatedSpan[] = [];

  for (const leaf of leaves) {
    const relevantAnchors = anchors.filter(
      (a) => a.startOffset < leaf.end && a.endOffset > leaf.start,
    );

    if (relevantAnchors.length === 0) {
      result.push({ ...leaf, highlighted: false });
      continue;
    }

    // Collect all split points within this leaf
    const splitPoints = new Set<number>();
    splitPoints.add(leaf.start);
    splitPoints.add(leaf.end);

    for (const anchor of relevantAnchors) {
      const clampedStart = Math.max(anchor.startOffset, leaf.start);
      const clampedEnd = Math.min(anchor.endOffset, leaf.end);
      splitPoints.add(clampedStart);
      splitPoints.add(clampedEnd);
    }

    const sortedPoints = Array.from(splitPoints).sort((a, b) => a - b);

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const segStart = sortedPoints[i];
      const segEnd = sortedPoints[i + 1];
      if (segStart === segEnd) continue;

      const segText = leaf.text.slice(
        segStart - leaf.start,
        segEnd - leaf.start,
      );

      // Find the anchor covering this segment (if any)
      const coveringAnchor = relevantAnchors.find(
        (a) => a.startOffset <= segStart && a.endOffset >= segEnd,
      );

      result.push({
        text: segText,
        start: segStart,
        end: segEnd,
        formatting: leaf.formatting,
        highlighted: !!coveringAnchor,
        anchorGroupKey: coveringAnchor?.key,
        anchorCount: coveringAnchor?.count,
      });
    }
  }

  return result;
}

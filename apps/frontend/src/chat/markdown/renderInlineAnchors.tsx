import type { ReactNode } from "react";

import { parseInlineMarkdown } from "./inlineParser";
import {
  flattenInlineLeaves,
  getRenderedTextForInlineSource,
  splitLeavesAtAnchors,
  type AnnotatedSpan,
} from "./offsetMap";
import type { InlineNode } from "./types";

export interface AnchorRange {
  key: string;
  startOffset: number;
  endOffset: number;
  count: number;
}

interface RenderAnchoredTextOptions {
  anchors: AnchorRange[];
  isFocused?: boolean;
  keyPrefix: string;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  sourceStart: number;
  text: string;
}

interface RenderAnchoredPlainTextOptions {
  anchors: AnchorRange[];
  darkBackground?: boolean;
  isFocused?: boolean;
  keyPrefix: string;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  text: string;
}

function renderFormattedSpan(
  span: AnnotatedSpan,
  key: string,
  registerAnchorRef?: (groupKey: string, node: HTMLSpanElement | null) => void,
  darkBackground?: boolean,
  isFocused?: boolean,
): ReactNode {
  let content: ReactNode = span.text;

  if (span.formatting.code) {
    content = (
      <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-[0.9em]">
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
    const focused = isFocused !== false;
    let highlightClass: string;
    let badgeClass: string;

    if (darkBackground) {
      highlightClass = focused
        ? "border border-yellow-500/60 bg-yellow-400/25 px-0.2 text-yellow-100 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
        : "border border-yellow-600/30 bg-yellow-400/10 px-0.2 text-yellow-200/60 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";
      badgeClass = focused
        ? "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-yellow-600/60 bg-yellow-900/40 px-1 align-middle text-[11px] font-semibold text-yellow-200"
        : "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-yellow-600/30 bg-yellow-900/20 px-1 align-middle text-[11px] font-semibold text-yellow-200/50";
    } else {
      highlightClass = focused
        ? "border border-yellow-400 bg-yellow-200 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
        : "border border-yellow-500/30 bg-yellow-400/20 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";
      badgeClass = focused
        ? "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-yellow-500 bg-yellow-50 px-1 align-middle text-[11px] font-semibold text-yellow-800"
        : "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-yellow-500/30 bg-yellow-50/50 px-1 align-middle text-[11px] font-semibold text-yellow-800/50";
    }

    return (
      <span
        key={key}
        className={highlightClass}
        ref={registerAnchorRef ? (node) => registerAnchorRef(span.anchorGroupKey!, node) : undefined}
      >
        <span>{content}</span>
        {span.anchorCount && span.anchorCount > 1 ? (
          <span className={badgeClass}>{span.anchorCount}</span>
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
          className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-[0.9em]"
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
  });
}

function getRelativeAnchors(
  anchors: AnchorRange[],
  startOffset: number,
  length: number,
): AnchorRange[] {
  return anchors
    .filter(
      (anchor) =>
        anchor.startOffset < startOffset + length && anchor.endOffset > startOffset,
    )
    .map((anchor) => ({
      ...anchor,
      startOffset: Math.max(anchor.startOffset, startOffset) - startOffset,
      endOffset: Math.min(anchor.endOffset, startOffset + length) - startOffset,
    }));
}

export function renderAnchoredInlineSource({
  anchors,
  isFocused,
  keyPrefix,
  registerAnchorRef,
  sourceStart,
  text,
}: RenderAnchoredTextOptions): ReactNode[] {
  const nodes = parseInlineMarkdown(text);
  const relativeAnchors = getRelativeAnchors(
    anchors,
    sourceStart,
    getRenderedTextForInlineSource(text).length,
  );
  const leaves = flattenInlineLeaves(nodes, 0);
  const annotated = splitLeavesAtAnchors(leaves, relativeAnchors);

  return annotated.map((span, index) =>
    renderFormattedSpan(
      span,
      `${keyPrefix}:${index}`,
      registerAnchorRef,
      false,
      isFocused,
    ),
  );
}

export function renderAnchoredPlainText({
  anchors,
  darkBackground,
  isFocused,
  keyPrefix,
  registerAnchorRef,
  text,
}: RenderAnchoredPlainTextOptions): ReactNode[] {
  if (anchors.length === 0) {
    return [<span key={`${keyPrefix}:text`}>{text}</span>];
  }

  const leaves = [
    {
      text,
      start: 0,
      end: text.length,
      formatting: {},
    },
  ];
  const annotated = splitLeavesAtAnchors(leaves, anchors);

  return annotated.map((span, index) =>
    renderFormattedSpan(
      span,
      `${keyPrefix}:${index}`,
      registerAnchorRef,
      darkBackground,
      isFocused,
    ),
  );
}

export function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  return renderInlineNodes(parseInlineMarkdown(text), keyPrefix);
}

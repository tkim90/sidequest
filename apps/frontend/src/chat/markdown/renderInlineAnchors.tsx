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
  preview?: boolean;
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
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
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
        className="text-primary underline decoration-primary/60 underline-offset-2 hover:text-accent-foreground"
      >
        {content}
      </a>
    );
  }

  if (span.highlighted && span.anchorGroupKey) {
    const focused = isFocused !== false;
    const isPreview = !!span.preview;
    let highlightClass: string;
    let badgeClass: string;

    if (isPreview) {
      highlightClass =
        "border border-dashed border-warning/60 bg-warning/15 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";
      badgeClass = ""; // unused for preview
    } else if (darkBackground) {
      highlightClass = focused
        ? "border border-warning/60 bg-warning/25 px-0.2 text-warning-foreground [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
        : "border border-warning/35 bg-warning/10 px-0.2 text-warning-foreground/70 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";
      badgeClass = focused
        ? "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/60 bg-warning/25 px-1 align-middle text-[11px] font-semibold text-warning-foreground"
        : "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/35 bg-warning/10 px-1 align-middle text-[11px] font-semibold text-warning-foreground/70";
    } else {
      highlightClass = focused
        ? "border border-warning/60 bg-warning/20 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
        : "border border-warning/35 bg-warning/10 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";
      badgeClass = focused
        ? "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/70 bg-warning/20 px-1 align-middle text-[11px] font-semibold text-foreground"
        : "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/35 bg-warning/10 px-1 align-middle text-[11px] font-semibold text-foreground/70";
    }

    return (
      <span
        key={key}
        className={highlightClass}
        ref={registerAnchorRef ? (node) => registerAnchorRef(span.anchorGroupKey!, node) : undefined}
      >
        <span>{content}</span>
        {!isPreview && span.anchorCount && span.anchorCount > 1 ? (
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
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground"
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
        className="text-primary underline decoration-primary/60 underline-offset-2 hover:text-accent-foreground"
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

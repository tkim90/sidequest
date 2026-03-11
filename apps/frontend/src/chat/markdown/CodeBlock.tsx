import { Fragment, useState, useCallback } from "react";
import { Highlight, themes, type Token } from "prism-react-renderer";

interface CodeBlockAnchorRange {
  key: string;
  startOffset: number;
  endOffset: number;
  count: number;
  preview?: boolean;
}

interface TokenSegment {
  anchor?: CodeBlockAnchorRange;
  endOffset: number;
  startOffset: number;
  text: string;
}

interface LinePart {
  token: Token;
  tokenIndex: number;
  segment: TokenSegment;
  segmentIndex: number;
}

interface LineRun {
  anchor?: CodeBlockAnchorRange;
  parts: LinePart[];
}

interface CodeBlockProps {
  anchorRanges?: CodeBlockAnchorRange[];
  code: string;
  isFocused?: boolean;
  language?: string;
  registerAnchorRef?: (groupKey: string, node: HTMLSpanElement | null) => void;
  variant?: "default" | "monochrome";
}

function CopyButton({ code, variant = "default" }: { code: string; variant?: "default" | "monochrome" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
        variant === "monochrome"
          ? "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          : "text-code-muted hover:bg-code-border/50 hover:text-code-foreground"
      }`}
      aria-label="Copy code"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function splitTokenByAnchors(
  tokenText: string,
  tokenStartOffset: number,
  anchors: CodeBlockAnchorRange[],
): TokenSegment[] {
  const tokenEndOffset = tokenStartOffset + tokenText.length;
  if (tokenText.length === 0) {
    return [];
  }

  const overlappingAnchors = anchors.filter(
    (anchor) =>
      anchor.startOffset < tokenEndOffset && anchor.endOffset > tokenStartOffset,
  );

  if (overlappingAnchors.length === 0) {
    return [
      {
        endOffset: tokenEndOffset,
        startOffset: tokenStartOffset,
        text: tokenText,
      },
    ];
  }

  const splitPoints = new Set<number>();
  splitPoints.add(tokenStartOffset);
  splitPoints.add(tokenEndOffset);

  overlappingAnchors.forEach((anchor) => {
    splitPoints.add(Math.max(anchor.startOffset, tokenStartOffset));
    splitPoints.add(Math.min(anchor.endOffset, tokenEndOffset));
  });

  const sortedPoints = Array.from(splitPoints).sort((a, b) => a - b);
  const segments: TokenSegment[] = [];

  for (let i = 0; i < sortedPoints.length - 1; i += 1) {
    const segmentStart = sortedPoints[i];
    const segmentEnd = sortedPoints[i + 1];
    if (segmentStart === segmentEnd) {
      continue;
    }

    const segmentText = tokenText.slice(
      segmentStart - tokenStartOffset,
      segmentEnd - tokenStartOffset,
    );
    const coveringAnchor = overlappingAnchors.find(
      (anchor) =>
        anchor.startOffset <= segmentStart && anchor.endOffset >= segmentEnd,
    );

    segments.push({
      anchor: coveringAnchor,
      endOffset: segmentEnd,
      startOffset: segmentStart,
      text: segmentText,
    });
  }

  return segments;
}

function getAnchorHighlightClass(isMonochrome: boolean, isFocused: boolean, isPreview?: boolean): string {
  if (isPreview) {
    return "border border-dashed border-warning/60 bg-warning/15 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";
  }

  if (isMonochrome) {
    return isFocused
      ? "border border-warning/60 bg-warning/20 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
      : "border border-warning/35 bg-warning/10 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";
  }

  return isFocused
    ? "border border-warning/65 bg-warning/25 px-0.2 text-warning-foreground [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
    : "border border-warning/35 bg-warning/15 px-0.2 text-warning-foreground/80 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";
}

function getAnchorBadgeClass(isMonochrome: boolean, isFocused: boolean): string {
  if (isMonochrome) {
    return isFocused
      ? "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/70 bg-warning/20 px-1 align-middle text-[11px] font-semibold text-foreground"
      : "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/35 bg-warning/10 px-1 align-middle text-[11px] font-semibold text-foreground/70";
  }

  return isFocused
    ? "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/70 bg-warning/25 px-1 align-middle text-[11px] font-semibold text-warning-foreground"
    : "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-warning/35 bg-warning/15 px-1 align-middle text-[11px] font-semibold text-warning-foreground/70";
}

function groupLineSegments(parts: LinePart[]): LineRun[] {
  if (parts.length === 0) return [];

  const runs: LineRun[] = [];
  let currentRun: LineRun = {
    anchor: parts[0].segment.anchor,
    parts: [parts[0]],
  };

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const currentKey = currentRun.anchor?.key;
    const partKey = part.segment.anchor?.key;

    if (currentKey === partKey) {
      currentRun.parts.push(part);
    } else {
      runs.push(currentRun);
      currentRun = { anchor: part.segment.anchor, parts: [part] };
    }
  }

  runs.push(currentRun);
  return runs;
}

export default function CodeBlock({
  anchorRanges = [],
  code,
  isFocused = true,
  language,
  registerAnchorRef,
  variant = "default",
}: CodeBlockProps) {
  const isMonochrome = variant === "monochrome";
  const normalizedAnchorRanges = anchorRanges
    .filter((anchor) => anchor.endOffset > anchor.startOffset)
    .sort((left, right) => left.startOffset - right.startOffset);

  return (
    <div className="my-3">
      <div
        className={`overflow-x-auto rounded-md ${
          isMonochrome
            ? "border border-border bg-card text-card-foreground shadow-sm"
            : "border border-code-border bg-code-surface text-code-foreground"
        }`}
      >
        <div
          className={`flex items-center justify-between px-3 py-1 ${
            isMonochrome ? "border-b border-border bg-muted" : "border-b border-code-border"
          }`}
        >
          <span className={`text-xs ${isMonochrome ? "text-muted-foreground" : "text-code-muted"}`}>
            {language || "text"}
          </span>
          <CopyButton code={code} variant={variant} />
        </div>
        <Highlight theme={isMonochrome ? themes.github : themes.oneDark} code={code} language={language || "text"}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre className="p-3 text-sm leading-6 font-mono" style={{ background: "transparent" }}>
              <code>
                {(() => {
                  let contentOffset = 0;
                  const renderedAnchorKeys = new Set<string>();
                  const renderedBadgeKeys = new Set<string>();

                  return tokens.map((line, lineIndex) => {
                    // Pass 1: Collect all LineParts for this line
                    const lineParts: LinePart[] = [];

                    line.forEach((token, tokenIndex) => {
                      const tokenText = token.content;
                      const tokenStartOffset = contentOffset;
                      contentOffset += tokenText.length;

                      if (
                        normalizedAnchorRanges.length === 0 ||
                        tokenText.length === 0
                      ) {
                        lineParts.push({
                          token,
                          tokenIndex,
                          segment: {
                            text: tokenText,
                            startOffset: tokenStartOffset,
                            endOffset: tokenStartOffset + tokenText.length,
                          },
                          segmentIndex: 0,
                        });
                        return;
                      }

                      const segments = splitTokenByAnchors(
                        tokenText,
                        tokenStartOffset,
                        normalizedAnchorRanges,
                      );

                      segments.forEach((segment, segmentIndex) => {
                        lineParts.push({ token, tokenIndex, segment, segmentIndex });
                      });
                    });

                    // Pass 2: Group consecutive same-anchor segments, then render
                    const runs = groupLineSegments(lineParts);

                    const lineNode = (
                      <div key={lineIndex} {...getLineProps({ line })}>
                        {runs.map((run, runIndex) => {
                          if (!run.anchor) {
                            return (
                              <Fragment key={`r${runIndex}`}>
                                {run.parts.map((part) => {
                                  const tokenProps = getTokenProps({ token: part.token });
                                  const { children: _children, ...restProps } = tokenProps;
                                  return (
                                    <span
                                      key={`${part.tokenIndex}:${part.segmentIndex}`}
                                      {...restProps}
                                    >
                                      {part.segment.text}
                                    </span>
                                  );
                                })}
                              </Fragment>
                            );
                          }

                          const anchor = run.anchor;
                          const shouldAttachRef =
                            registerAnchorRef &&
                            !renderedAnchorKeys.has(anchor.key);
                          if (shouldAttachRef) {
                            renderedAnchorKeys.add(anchor.key);
                          }

                          const showBadge =
                            !anchor.preview &&
                            anchor.count > 1 &&
                            !renderedBadgeKeys.has(anchor.key);
                          if (showBadge) {
                            renderedBadgeKeys.add(anchor.key);
                          }

                          return (
                            <span
                              key={`r${runIndex}`}
                              className={getAnchorHighlightClass(isMonochrome, isFocused, anchor.preview)}
                              ref={
                                shouldAttachRef
                                  ? (node) => registerAnchorRef(anchor.key, node)
                                  : undefined
                              }
                            >
                              {run.parts.map((part) => {
                                const tokenProps = getTokenProps({ token: part.token });
                                const {
                                  children: _children,
                                  className,
                                  style,
                                  ...restTokenProps
                                } = tokenProps;
                                return (
                                  <span
                                    key={`${part.tokenIndex}:${part.segmentIndex}`}
                                    className={className}
                                    style={style}
                                    {...restTokenProps}
                                  >
                                    {part.segment.text}
                                  </span>
                                );
                              })}
                              {showBadge ? (
                                <span
                                  className={getAnchorBadgeClass(
                                    isMonochrome,
                                    isFocused,
                                  )}
                                >
                                  {anchor.count}
                                </span>
                              ) : null}
                            </span>
                          );
                        })}
                      </div>
                    );

                    if (lineIndex < tokens.length - 1) {
                      contentOffset += 1;
                    }

                    return lineNode;
                  });
                })()}
              </code>
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}

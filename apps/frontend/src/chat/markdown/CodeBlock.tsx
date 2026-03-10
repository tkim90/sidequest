import { useState, useCallback } from "react";
import { Highlight, themes } from "prism-react-renderer";

interface CodeBlockAnchorRange {
  key: string;
  startOffset: number;
  endOffset: number;
  count: number;
}

interface TokenSegment {
  anchor?: CodeBlockAnchorRange;
  endOffset: number;
  startOffset: number;
  text: string;
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
          : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
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

function getAnchorHighlightClass(isMonochrome: boolean, isFocused: boolean): string {
  if (isMonochrome) {
    return isFocused
      ? "border border-yellow-400 bg-yellow-100/80 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
      : "border border-yellow-500/35 bg-yellow-100/50 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";
  }

  return isFocused
    ? "border border-yellow-500/65 bg-yellow-400/25 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
    : "border border-yellow-600/30 bg-yellow-400/14 px-0.2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";
}

function getAnchorBadgeClass(isMonochrome: boolean, isFocused: boolean): string {
  if (isMonochrome) {
    return isFocused
      ? "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-yellow-500 bg-yellow-50 px-1 align-middle text-[11px] font-semibold text-yellow-800"
      : "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-yellow-500/35 bg-yellow-50/80 px-1 align-middle text-[11px] font-semibold text-yellow-800/70";
  }

  return isFocused
    ? "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-yellow-600/60 bg-yellow-900/35 px-1 align-middle text-[11px] font-semibold text-yellow-100"
    : "ml-1 inline-flex min-w-5 translate-y-[-1px] justify-center border border-yellow-600/30 bg-yellow-900/20 px-1 align-middle text-[11px] font-semibold text-yellow-100/55";
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
          isMonochrome ? "border border-border bg-card text-card-foreground shadow-sm" : "bg-[#282c34]"
        }`}
      >
        <div
          className={`flex items-center justify-between px-3 py-1 ${
            isMonochrome ? "border-b border-border bg-muted" : "border-b border-zinc-700"
          }`}
        >
          <span className={`text-xs ${isMonochrome ? "text-muted-foreground" : "text-zinc-400"}`}>
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
                    const lineNode = (
                      <div key={lineIndex} {...getLineProps({ line })}>
                        {line.map((token, tokenIndex) => {
                          const tokenText = token.content;
                          const tokenStartOffset = contentOffset;
                          contentOffset += tokenText.length;

                          if (
                            normalizedAnchorRanges.length === 0 ||
                            tokenText.length === 0
                          ) {
                            return <span key={tokenIndex} {...getTokenProps({ token })} />;
                          }

                          const segments = splitTokenByAnchors(
                            tokenText,
                            tokenStartOffset,
                            normalizedAnchorRanges,
                          );

                          if (segments.length === 1 && !segments[0].anchor) {
                            return <span key={tokenIndex} {...getTokenProps({ token })} />;
                          }

                          const tokenProps = getTokenProps({ token });
                          const {
                            children: _children,
                            className,
                            style,
                            ...restTokenProps
                          } = tokenProps;

                          return (
                            <span key={tokenIndex}>
                              {segments.map((segment, segmentIndex) => {
                                const segmentKey = `${tokenIndex}:${segmentIndex}:${segment.startOffset}:${segment.endOffset}`;

                                if (!segment.anchor) {
                                  return (
                                    <span
                                      key={segmentKey}
                                      className={className}
                                      style={style}
                                      {...restTokenProps}
                                    >
                                      {segment.text}
                                    </span>
                                  );
                                }

                                const anchor = segment.anchor;
                                const shouldAttachRef =
                                  registerAnchorRef &&
                                  !renderedAnchorKeys.has(anchor.key);
                                if (shouldAttachRef) {
                                  renderedAnchorKeys.add(anchor.key);
                                }

                                const showBadge =
                                  anchor.count > 1 &&
                                  !renderedBadgeKeys.has(anchor.key);
                                if (showBadge) {
                                  renderedBadgeKeys.add(anchor.key);
                                }

                                return (
                                  <span
                                    key={segmentKey}
                                    className={getAnchorHighlightClass(isMonochrome, isFocused)}
                                    ref={
                                      shouldAttachRef
                                        ? (node) => registerAnchorRef(anchor.key, node)
                                        : undefined
                                    }
                                  >
                                    <span
                                      className={className}
                                      style={style}
                                      {...restTokenProps}
                                    >
                                      {segment.text}
                                    </span>
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

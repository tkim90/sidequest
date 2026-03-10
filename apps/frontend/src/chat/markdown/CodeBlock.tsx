import { useState, useCallback } from "react";
import { Highlight, themes } from "prism-react-renderer";

interface CodeBlockProps {
  code: string;
  language?: string;
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

export default function CodeBlock({ code, language, variant = "default" }: CodeBlockProps) {
  const isMonochrome = variant === "monochrome";

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
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </code>
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";

import type { JsonRenderSpec } from "./types";

interface ImageRendererProps {
  spec: JsonRenderSpec;
  partial?: boolean;
  rawJson?: string;
}

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export default function ImageRenderer({ spec, partial, rawJson }: ImageRendererProps) {
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const prevUrlRef = useRef<string | null>(null);
  const specJson = JSON.stringify(spec);

  useEffect(() => {
    const controller = new AbortController();

    const doRender = () => {
      fetch("/api/image/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec, format: "svg" }),
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
          prevUrlRef.current = url;
          setSvgUrl(url);
          setError(null);
        })
        .catch((err) => {
          if (err.name !== "AbortError") setError(err.message);
        });
    };

    // Debounce during streaming to avoid excessive requests
    const delay = partial ? 1500 : 0;
    const timer = setTimeout(doRender, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specJson, partial]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  const handleDownload = () => {
    if (!svgUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = svgUrl;
    link.download = "json-render-image.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <div className="my-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
        Image render failed: {error}
      </div>
    );
  }

  return (
    <div
      className="my-3"
      data-no-branch
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {svgUrl ? (
        <div className="group relative inline-block max-w-full">
          <button
            type="button"
            onClick={handleDownload}
            className="absolute top-2 right-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border/80 bg-card/90 text-muted-foreground opacity-25 shadow-sm backdrop-blur transition-[opacity,background-color,color] hover:bg-card hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Download rendered image"
            title="Download image"
          >
            <DownloadIcon />
          </button>
          <img
            src={svgUrl}
            alt="Generated image"
            className={`max-w-full rounded ${partial && !svgUrl ? "opacity-50" : ""}`}
          />
        </div>
      ) : (
        <div className="flex h-40 animate-pulse items-center justify-center rounded bg-zinc-100">
          <span className="text-sm text-zinc-400">Generating image...</span>
        </div>
      )}
      {rawJson && (
        <div className="mt-2 flex flex-col items-end">
          <button
            type="button"
            className="rounded border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-200"
            onClick={() => setShowMetadata((v) => !v)}
          >
            {showMetadata ? "Hide Metadata" : "See Metadata"}
          </button>
          {showMetadata && (
            <pre className="mt-1 max-h-64 w-full overflow-auto rounded bg-zinc-900 p-3 font-mono text-xs text-zinc-100">
              {rawJson}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function ImageRendererSkeleton() {
  return (
    <div className="my-3 flex h-40 animate-pulse items-center justify-center rounded bg-zinc-100">
      <span className="text-sm text-zinc-400">Generating image...</span>
    </div>
  );
}

import { memo, useEffect, useState } from "react";

import {
  buildIframeEmbedSrcDoc,
  IFRAME_EMBED_DEFAULT_HEIGHT,
  IFRAME_EMBED_MESSAGE_SOURCE,
  IFRAME_EMBED_MIN_HEIGHT,
} from "../markdown/iframeEmbed";

interface IframeMessageEmbedProps {
  embedId: string;
  html: string;
}

const MAX_IFRAME_EMBED_HEIGHT = 1600;

const IframeMessageEmbed = memo(function IframeMessageEmbed({
  embedId,
  html,
}: IframeMessageEmbedProps) {
  const [height, setHeight] = useState(IFRAME_EMBED_DEFAULT_HEIGHT);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    setHeight(IFRAME_EMBED_DEFAULT_HEIGHT);
    setRuntimeError(null);
  }, [embedId, html]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") {
        return;
      }

      const payload = data as Record<string, unknown>;
      if (
        payload.source !== IFRAME_EMBED_MESSAGE_SOURCE ||
        payload.embedId !== embedId
      ) {
        return;
      }

      if (payload.type === "resize" && typeof payload.height === "number") {
        setHeight(
          Math.min(
            MAX_IFRAME_EMBED_HEIGHT,
            Math.max(IFRAME_EMBED_MIN_HEIGHT, Math.ceil(payload.height)),
          ),
        );
        return;
      }

      if (payload.type === "error" && typeof payload.message === "string") {
        setRuntimeError(payload.message);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [embedId]);

  return (
    <div
      className="my-3 overflow-hidden rounded-2xl border border-border bg-background/40"
      data-no-branch
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <iframe
        className="block w-full border-0 bg-transparent"
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts"
        scrolling="no"
        srcDoc={buildIframeEmbedSrcDoc({ embedId, html })}
        style={{ height: `${height}px` }}
        title="Assistant visualization"
      />
      {runtimeError ? (
        <div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Iframe runtime error: {runtimeError}
        </div>
      ) : null}
    </div>
  );
});

export default IframeMessageEmbed;

export function IframeMessageEmbedSkeleton() {
  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-border bg-card" data-no-branch>
      <div className="animate-pulse space-y-4 p-4">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-48 rounded-xl border border-border bg-secondary" />
      </div>
    </div>
  );
}

export const IFRAME_EMBED_MESSAGE_SOURCE = "sidequest-iframe-embed";
export const IFRAME_EMBED_MIN_HEIGHT = 160;
export const IFRAME_EMBED_DEFAULT_HEIGHT = 320;
const SAFE_NAMESPACE_URIS = [
  "http://www.w3.org/2000/svg",
  "http://www.w3.org/1999/xlink",
] as const;

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /<!doctype|<html\b|<head\b|<body\b/i,
    reason: "Use an HTML fragment only, not a full document.",
  },
  {
    pattern: /<script\b[^>]*\bsrc\s*=/i,
    reason: "External scripts are not allowed inside iframe embeds.",
  },
  {
    pattern: /<link\b/i,
    reason: "External stylesheets are not allowed inside iframe embeds.",
  },
  {
    pattern: /\b(fetch|XMLHttpRequest|WebSocket|EventSource)\b/i,
    reason: "Network APIs are not allowed inside iframe embeds.",
  },
  {
    pattern: /\b(window\.parent|parent\.document|top\.|window\.top)\b/i,
    reason: "Parent window access is not allowed inside iframe embeds.",
  },
  {
    pattern: /\b(window\.open|location\s*=|location\.href|form\.submit)\b/i,
    reason: "Navigation and popup APIs are not allowed inside iframe embeds.",
  },
  {
    pattern: /<form\b/i,
    reason: "Forms are not allowed inside iframe embeds.",
  },
];

export interface IframeEmbedValidationResult {
  ok: boolean;
  reason?: string;
}

function stripSafeNamespaceUris(html: string): string {
  return SAFE_NAMESPACE_URIS.reduce(
    (current, uri) => current.split(uri).join(""),
    html,
  );
}

export function validateIframeEmbedHtml(
  html: string,
): IframeEmbedValidationResult {
  const trimmed = html.trim();
  if (!trimmed) {
    return {
      ok: false,
      reason: "Iframe embeds must include HTML, SVG, or JS content.",
    };
  }

  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.pattern.test(trimmed)) {
      return {
        ok: false,
        reason: rule.reason,
      };
    }
  }

  if (/https?:\/\//i.test(stripSafeNamespaceUris(trimmed))) {
    return {
      ok: false,
      reason: "External network resources are not allowed inside iframe embeds.",
    };
  }

  return { ok: true };
}

export function buildIframeEmbedSrcDoc({
  embedId,
  html,
}: {
  embedId: string;
  html: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src data:; media-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; frame-src 'none'; child-src 'none'; form-action 'none'; base-uri 'none'"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light dark;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: transparent;
        overflow: hidden;
      }

      body {
        min-height: ${IFRAME_EMBED_MIN_HEIGHT}px;
      }

      #app {
        width: 100%;
      }
    </style>
  </head>
  <body>
    <div id="app">${html}</div>
    <script>
      const SOURCE = ${JSON.stringify(IFRAME_EMBED_MESSAGE_SOURCE)};
      const EMBED_ID = ${JSON.stringify(embedId)};
      const MIN_HEIGHT = ${IFRAME_EMBED_MIN_HEIGHT};

      function postToHost(payload) {
        window.parent.postMessage(
          { source: SOURCE, embedId: EMBED_ID, ...payload },
          "*",
        );
      }

      function measureHeight() {
        const body = document.body;
        const root = document.documentElement;
        const nextHeight = Math.max(
          MIN_HEIGHT,
          Math.ceil(
            Math.max(
              body.scrollHeight,
              body.offsetHeight,
              root.scrollHeight,
              root.offsetHeight,
              root.clientHeight,
            ),
          ),
        );

        postToHost({ type: "resize", height: nextHeight });
      }

      const resizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(measureHeight);
      });
      resizeObserver.observe(document.body);

      const mutationObserver = new MutationObserver(() => {
        window.requestAnimationFrame(measureHeight);
      });
      mutationObserver.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true,
      });

      window.addEventListener("error", (event) => {
        postToHost({
          type: "error",
          message: event.message || "Iframe runtime error",
        });
      });

      window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason;
        const message =
          typeof reason === "string"
            ? reason
            : reason && typeof reason.message === "string"
              ? reason.message
              : "Unhandled promise rejection";

        postToHost({
          type: "error",
          message,
        });
      });

      window.addEventListener("load", () => {
        measureHeight();
        window.setTimeout(measureHeight, 50);
      });

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          measureHeight();
        });
      }

      measureHeight();
    </script>
  </body>
</html>`;
}

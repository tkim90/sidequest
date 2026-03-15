import { describe, expect, it } from "vitest";

import {
  buildIframeEmbedSrcDoc,
  IFRAME_EMBED_MESSAGE_SOURCE,
  validateIframeEmbedHtml,
} from "./iframeEmbed";

describe("validateIframeEmbedHtml", () => {
  it("accepts self-contained iframe HTML fragments", () => {
    expect(
      validateIframeEmbedHtml(
        [
          "<style>.card { padding: 12px; }</style>",
          "<div class='card'>hello</div>",
          "<script>document.body.dataset.ready = 'true';</script>",
        ].join(""),
      ),
    ).toEqual({ ok: true });
  });

  it("allows inline SVG namespace literals without treating them as network loads", () => {
    expect(
      validateIframeEmbedHtml(
        [
          "<svg id='graph'></svg>",
          "<script>",
          "const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');",
          "document.getElementById('graph').appendChild(circle);",
          "</script>",
        ].join(""),
      ),
    ).toEqual({ ok: true });
  });

  it("rejects full HTML documents and parent DOM access", () => {
    expect(validateIframeEmbedHtml("<html><body>bad</body></html>")).toEqual({
      ok: false,
      reason: "Use an HTML fragment only, not a full document.",
    });

    expect(
      validateIframeEmbedHtml(
        "<script>window.parent.postMessage('oops', '*')</script>",
      ),
    ).toEqual({
      ok: false,
      reason: "Parent window access is not allowed inside iframe embeds.",
    });
  });

  it("rejects real external asset URLs", () => {
    expect(
      validateIframeEmbedHtml("<image href='https://example.com/graph.svg' />"),
    ).toEqual({
      ok: false,
      reason: "External network resources are not allowed inside iframe embeds.",
    });
  });
});

describe("buildIframeEmbedSrcDoc", () => {
  it("wraps the fragment in a strict iframe document", () => {
    const srcDoc = buildIframeEmbedSrcDoc({
      embedId: "message-1:block-2",
      html: "<div>hello</div>",
    });

    expect(srcDoc).toContain("default-src 'none'");
    expect(srcDoc).not.toContain("https://");
    expect(srcDoc).toContain(IFRAME_EMBED_MESSAGE_SOURCE);
    expect(srcDoc).toContain('"message-1:block-2"');
    expect(srcDoc).toContain("<div id=\"app\"><div>hello</div></div>");
  });
});

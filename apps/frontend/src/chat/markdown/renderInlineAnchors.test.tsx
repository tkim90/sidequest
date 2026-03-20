import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { renderAnchoredInlineSource } from "./renderInlineAnchors";

describe("renderAnchoredInlineSource", () => {
  it("renders active source anchors with the lighter highlight", () => {
    const markup = renderToStaticMarkup(
      <div>
        {renderAnchoredInlineSource({
          anchors: [
            {
              key: "anchor-1",
              startOffset: 6,
              endOffset: 11,
              count: 1,
              activeSource: true,
            },
          ],
          isFocused: true,
          keyPrefix: "test",
          registerAnchorRef: () => {},
          sourceStart: 0,
          text: "Hello **world**",
        })}
      </div>,
    );

    expect(markup).toContain('border-warning/45 bg-warning/10');
    expect(markup).not.toContain('bg-warning/20');
  });
});

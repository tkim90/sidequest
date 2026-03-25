import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RenderActiveBlock, RenderFinalizedBlock } from "./BlockRenderers";

describe("BlockRenderers list padding", () => {
  it("renders finalized unordered lists with left padding", () => {
    const markup = renderToStaticMarkup(
      <RenderFinalizedBlock
        block={{
          id: 1,
          items: ["Alpha", "Beta"],
          type: "unordered_list",
        }}
        ctx={{
          anchorGroups: [],
          blockOffset: {
            blockIndex: 0,
            renderedEnd: 10,
            renderedStart: 0,
          },
          isFocused: false,
          registerAnchorRef: () => {},
        }}
      />,
    );

    expect(markup).toContain('class="list-disc space-y-1 pl-6"');
  });

  it("renders active ordered lists with the same left padding", () => {
    const markup = renderToStaticMarkup(
      <RenderActiveBlock
        block={{
          id: 2,
          items: [
            {
              index: 1,
              text: "First",
            },
          ],
          type: "ordered_list",
        }}
        streamKey="active-list"
      />,
    );

    expect(markup).toContain('class="list-decimal space-y-1 pl-6"');
  });
});

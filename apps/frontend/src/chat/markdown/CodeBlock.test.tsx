import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CodeBlock from "./CodeBlock";

describe("CodeBlock", () => {
  it("renders active source anchors with the stronger code highlight", () => {
    const markup = renderToStaticMarkup(
      <CodeBlock
        anchorRanges={[
          {
            key: "anchor-1",
            startOffset: 6,
            endOffset: 11,
            count: 1,
            activeSource: true,
          },
        ]}
        code={'const value = "hello";'}
        isFocused
        language="ts"
      />,
    );

    expect(markup).toContain('border-warning/70 bg-warning/35');
    expect(markup).not.toContain('bg-warning/25');
  });
});

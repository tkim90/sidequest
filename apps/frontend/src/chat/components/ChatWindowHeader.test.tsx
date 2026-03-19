import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChatWindowHeader, { getAnimatedTitleUnits } from "./ChatWindowHeader";

describe("getAnimatedTitleUnits", () => {
  it("preserves spaces and only staggers visible characters", () => {
    expect(getAnimatedTitleUnits("Chat 1!")).toEqual([
      { character: "C", isSpace: false, key: "char-0-C", visibleIndex: 0 },
      { character: "h", isSpace: false, key: "char-1-h", visibleIndex: 1 },
      { character: "a", isSpace: false, key: "char-2-a", visibleIndex: 2 },
      { character: "t", isSpace: false, key: "char-3-t", visibleIndex: 3 },
      { character: " ", isSpace: true, key: "space-4", visibleIndex: null },
      { character: "1", isSpace: false, key: "char-5-1", visibleIndex: 4 },
      { character: "!", isSpace: false, key: "char-6-!", visibleIndex: 5 },
    ]);
  });
});

describe("ChatWindowHeader", () => {
  it("renders animated title spans only for the fixed pane", () => {
    const fixedMarkup = renderToStaticMarkup(
      <ChatWindowHeader
        branchFocus={null}
        isFixedPane
        onClose={() => {}}
        showCloseButton={false}
        title="Chat 1"
      />,
    );
    const floatingMarkup = renderToStaticMarkup(
      <ChatWindowHeader
        branchFocus={null}
        isFixedPane={false}
        onClose={() => {}}
        showCloseButton={false}
        title="Chat 1"
      />,
    );

    expect(fixedMarkup).toContain('data-animated-title="true"');
    expect(fixedMarkup.match(/data-animated-title-char="true"/g)?.length).toBe(5);
    expect(fixedMarkup).toContain('aria-label="Chat 1"');

    expect(floatingMarkup).not.toContain('data-animated-title="true"');
    expect(floatingMarkup).toContain(">Chat 1</h2>");
  });
});

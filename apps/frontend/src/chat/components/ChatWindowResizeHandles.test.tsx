import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChatWindowResizeHandles from "./ChatWindowResizeHandles";

describe("ChatWindowResizeHandles", () => {
  it("renders elevated top resize targets without removing the bottom ones", () => {
    const markup = renderToStaticMarkup(
      <ChatWindowResizeHandles onResizePointerDown={() => {}} />,
    );

    expect(markup).toContain('data-resize-handle="top"');
    expect(markup).toContain('data-resize-handle="top-left"');
    expect(markup).toContain('data-resize-handle="top-right"');
    expect(markup).toContain('data-resize-handle="bottom"');
    expect(markup).toContain('data-resize-handle="bottom-left"');
    expect(markup).toContain('data-resize-handle="bottom-right"');
    expect(markup).toContain('inset-x-5 top-0 z-40 h-3 cursor-n-resize');
    expect(markup).toContain('left-0 top-0 z-40 h-5 w-5 cursor-nwse-resize');
    expect(markup).toContain('right-0 top-0 z-40 h-5 w-5 cursor-nesw-resize');
    expect(markup).toContain('bottom-0 z-20 h-2 cursor-s-resize');
  });
});

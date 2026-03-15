import { describe, expect, it } from "vitest";

import { shouldRenderJsonRenderBlock } from "./BlockRenderers";

describe("shouldRenderJsonRenderBlock", () => {
  it("blocks jsonrender for iframe-forced replies", () => {
    expect(shouldRenderJsonRenderBlock("force_iframe")).toBe(false);
  });

  it("allows jsonrender for default replies", () => {
    expect(shouldRenderJsonRenderBlock("default")).toBe(true);
  });
});

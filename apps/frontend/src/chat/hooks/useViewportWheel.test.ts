import { describe, expect, it } from "vitest";

import { getNextViewportZoomScale } from "./useViewportWheel";

describe("getNextViewportZoomScale", () => {
  it("does not zoom out below 100 percent", () => {
    expect(getNextViewportZoomScale(1, 120)).toBe(1);
    expect(getNextViewportZoomScale(1.02, 120)).toBe(1);
  });

  it("still zooms in above 100 percent", () => {
    expect(getNextViewportZoomScale(1, -120)).toBe(1.08);
  });

  it("respects the configured upper bound", () => {
    expect(getNextViewportZoomScale(1.5, -120)).toBe(1.5);
  });
});

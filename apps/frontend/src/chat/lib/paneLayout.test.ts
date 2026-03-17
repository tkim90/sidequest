import { describe, expect, it } from "vitest";

import {
  clampLeftPaneWidth,
  resolveStoredLeftPaneWidth,
} from "./paneLayout";

describe("paneLayout", () => {
  it("clamps widths below the left minimum", () => {
    expect(clampLeftPaneWidth(280, 1400)).toBe(420);
  });

  it("clamps widths that would hide the right pane", () => {
    expect(clampLeftPaneWidth(1200, 1200)).toBe(762);
  });

  it("reclamps stored widths against the current container", () => {
    expect(resolveStoredLeftPaneWidth("960", 1100)).toBe(662);
  });
});

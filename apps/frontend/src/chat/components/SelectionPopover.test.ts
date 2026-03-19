import { describe, expect, it } from "vitest";

import { resolveSelectionPopoverPosition } from "./SelectionPopover";

describe("resolveSelectionPopoverPosition", () => {
  it("centers the popover when there is enough room", () => {
    expect(
      resolveSelectionPopoverPosition({
        anchorX: 500,
        anchorY: 300,
        popoverHeight: 100,
        popoverWidth: 420,
        viewportHeight: 900,
        viewportWidth: 1200,
      }),
    ).toEqual({
      left: 290,
      top: 188,
    });
  });

  it("clamps the popover near the left edge", () => {
    expect(
      resolveSelectionPopoverPosition({
        anchorX: 90,
        anchorY: 320,
        popoverHeight: 100,
        popoverWidth: 420,
        viewportHeight: 900,
        viewportWidth: 1200,
      }),
    ).toEqual({
      left: 16,
      top: 208,
    });
  });

  it("clamps the popover near the right edge", () => {
    expect(
      resolveSelectionPopoverPosition({
        anchorX: 1110,
        anchorY: 320,
        popoverHeight: 100,
        popoverWidth: 420,
        viewportHeight: 900,
        viewportWidth: 1200,
      }),
    ).toEqual({
      left: 764,
      top: 208,
    });
  });

  it("flips the popover below when there is not enough room above", () => {
    expect(
      resolveSelectionPopoverPosition({
        anchorX: 500,
        anchorY: 80,
        popoverHeight: 100,
        popoverWidth: 420,
        viewportHeight: 900,
        viewportWidth: 1200,
      }),
    ).toEqual({
      left: 290,
      top: 92,
    });
  });
});

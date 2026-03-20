import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SelectionPopover, { resolveSelectionPopoverPosition } from "./SelectionPopover";

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

  it("centers a compact CTA popover when there is enough room", () => {
    expect(
      resolveSelectionPopoverPosition({
        anchorX: 500,
        anchorY: 300,
        popoverHeight: 48,
        popoverWidth: 280,
        viewportHeight: 900,
        viewportWidth: 1200,
      }),
    ).toEqual({
      left: 360,
      top: 240,
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

describe("SelectionPopover", () => {
  const selectionState = {
    parentWindowId: "window-1",
    parentMessageId: "message-1",
    selectedText: "selected text",
    stage: "cta" as const,
    x: 500,
    y: 300,
    windowLocalY: 120,
  };

  it("renders the CTA bubble for a fresh selection", () => {
    const markup = renderToStaticMarkup(
      createElement(SelectionPopover, {
        onExpand: () => {},
        onBranch: () => {},
        popoverRef: createRef<HTMLDivElement>(),
        selectionState,
      }),
    );

    expect(markup).toContain("Explore further in new chat window");
    expect(markup).not.toContain("Ask a new question...");
  });

  it("renders the composer UI when expanded", () => {
    const markup = renderToStaticMarkup(
      createElement(SelectionPopover, {
        onExpand: () => {},
        onBranch: () => {},
        popoverRef: createRef<HTMLDivElement>(),
        selectionState: { ...selectionState, stage: "compose" },
      }),
    );

    expect(markup).toContain('placeholder="Ask a new question..."');
    expect(markup).toContain(">New Chat<");
  });
});

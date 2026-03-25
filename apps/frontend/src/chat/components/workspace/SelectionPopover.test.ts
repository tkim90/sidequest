import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SelectionPopover, {
  getSelectionIdentityKey,
  resolveSelectionPopoverPosition,
  BranchComposeForm,
  BranchCtaButton,
} from "./SelectionPopover";

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

    expect(markup).toContain("Branch in new window");
    expect(markup).not.toContain("Ask a follow-up question...");
    expect(markup).toContain("z-[60]");
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

    expect(markup).toContain('placeholder="Ask a follow-up question..."');
    expect(markup).toContain(">New Chat<");
  });
});

describe("getSelectionIdentityKey", () => {
  it("returns a composite key from the selection identity fields", () => {
    expect(
      getSelectionIdentityKey({
        parentWindowId: "win-a",
        parentMessageId: "msg-b",
        selectedText: "hello world",
        stage: "cta",
        x: 0,
        y: 0,
        windowLocalY: 0,
      }),
    ).toBe("win-a:msg-b:hello world");
  });

  it("produces a different key when any identity field changes", () => {
    const base = {
      parentWindowId: "w1",
      parentMessageId: "m1",
      selectedText: "text",
      stage: "cta" as const,
      x: 0,
      y: 0,
      windowLocalY: 0,
    };

    const keyA = getSelectionIdentityKey(base);
    const keyB = getSelectionIdentityKey({ ...base, parentMessageId: "m2" });
    const keyC = getSelectionIdentityKey({ ...base, selectedText: "other" });

    expect(keyA).not.toBe(keyB);
    expect(keyA).not.toBe(keyC);
    expect(keyB).not.toBe(keyC);
  });
});

describe("BranchCtaButton", () => {
  it("renders the expand CTA label", () => {
    const markup = renderToStaticMarkup(
      createElement(BranchCtaButton, { onExpand: () => {} }),
    );

    expect(markup).toContain("Branch in new window");
    expect(markup).toContain("<button");
  });
});

describe("BranchComposeForm", () => {
  it("renders the compose input and submit button", () => {
    const markup = renderToStaticMarkup(
      createElement(BranchComposeForm, { onBranch: () => {} }),
    );

    expect(markup).toContain('placeholder="Ask a follow-up question..."');
    expect(markup).toContain(">New Chat<");
    expect(markup).toContain("Sidebar this selection into a new chat?");
  });
});

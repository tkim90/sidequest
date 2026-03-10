import { describe, expect, it } from "vitest";

import { mergeJsonRenderSpec } from "./mergeSpec";
import type { JsonRenderSpec } from "./types";

function createSpec(text: string): JsonRenderSpec {
  return {
    root: "layout",
    elements: {
      layout: {
        type: "Stack",
        props: { direction: "vertical" },
        children: ["left", "right"],
      },
      left: {
        type: "Card",
        children: ["leftText"],
      },
      leftText: {
        type: "Text",
        props: { content: text },
      },
      right: {
        type: "Card",
        children: ["rightText"],
      },
      rightText: {
        type: "Text",
        props: { content: "stable" },
      },
      dangling: {
        type: "Text",
        props: { content: "unused" },
      },
    },
  };
}

describe("mergeJsonRenderSpec", () => {
  it("returns the previous spec reference when nothing changed", () => {
    const previous = createSpec("hello");
    const next = createSpec("hello");

    const merged = mergeJsonRenderSpec(previous, next);

    expect(merged).toBe(previous);
  });

  it("updates only the changed branch and keeps stable siblings", () => {
    const previous = createSpec("hello");
    const next = createSpec("hello world");

    const merged = mergeJsonRenderSpec(previous, next);

    expect(merged).not.toBe(previous);
    expect(merged.elements.leftText).not.toBe(previous.elements.leftText);
    expect(merged.elements.left).not.toBe(previous.elements.left);
    expect(merged.elements.layout).not.toBe(previous.elements.layout);
    expect(merged.elements.right).toBe(previous.elements.right);
    expect(merged.elements.rightText).toBe(previous.elements.rightText);
  });

  it("preserves the render tree when only dangling elements are removed", () => {
    const previous = createSpec("hello");
    const next = createSpec("hello");
    const { dangling: _removed, ...keptElements } = next.elements;

    const merged = mergeJsonRenderSpec(previous, {
      ...next,
      elements: keptElements,
    });

    expect(merged).not.toBe(previous);
    expect(merged.elements.layout).toBe(previous.elements.layout);
    expect(merged.elements.left).toBe(previous.elements.left);
    expect(merged.elements.right).toBe(previous.elements.right);
  });

  it("falls back to the next spec when the root id changes", () => {
    const previous = createSpec("hello");
    const next: JsonRenderSpec = {
      ...createSpec("hello"),
      root: "right",
    };

    const merged = mergeJsonRenderSpec(previous, next);

    expect(merged).toBe(next);
  });
});

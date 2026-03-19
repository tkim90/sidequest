import { describe, expect, it } from "vitest";

import { resolveScrollTopAfterContentChange } from "./useChatWindowLayout";

describe("resolveScrollTopAfterContentChange", () => {
  it("sticks to the bottom while streaming when no manual lock exists", () => {
    expect(
      resolveScrollTopAfterContentChange({
        clientHeight: 300,
        isStreaming: true,
        savedScrollTop: 120,
        scrollHeight: 900,
        shouldAutoScroll: false,
        streamScrollLock: null,
      }),
    ).toBe(600);
  });

  it("preserves the locked scroll position while streaming", () => {
    expect(
      resolveScrollTopAfterContentChange({
        clientHeight: 300,
        isStreaming: true,
        savedScrollTop: 580,
        scrollHeight: 1200,
        shouldAutoScroll: true,
        streamScrollLock: 180,
      }),
    ).toBe(180);
  });

  it("clamps the locked scroll position if content shrinks", () => {
    expect(
      resolveScrollTopAfterContentChange({
        clientHeight: 300,
        isStreaming: true,
        savedScrollTop: 580,
        scrollHeight: 500,
        shouldAutoScroll: true,
        streamScrollLock: 250,
      }),
    ).toBe(200);
  });

  it("falls back to normal auto-scroll when not streaming", () => {
    expect(
      resolveScrollTopAfterContentChange({
        clientHeight: 300,
        isStreaming: false,
        savedScrollTop: 180,
        scrollHeight: 900,
        shouldAutoScroll: true,
        streamScrollLock: 150,
      }),
    ).toBe(600);
  });

  it("restores the persisted scroll position when not streaming and auto-scroll is disabled", () => {
    expect(
      resolveScrollTopAfterContentChange({
        clientHeight: 300,
        isStreaming: false,
        savedScrollTop: 180,
        scrollHeight: 900,
        shouldAutoScroll: false,
        streamScrollLock: null,
      }),
    ).toBe(180);
  });
});

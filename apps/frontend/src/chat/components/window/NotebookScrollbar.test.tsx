import { describe, expect, it } from "vitest";

import { computeScrollbarState } from "./NotebookScrollbar";

describe("computeScrollbarState", () => {
  it("returns null when content fits within the viewport", () => {
    const result = computeScrollbarState({
      clientHeight: 500,
      scrollHeight: 500,
      scrollTop: 0,
    });

    expect(result).toBeNull();
  });

  it("returns null when clientHeight is zero", () => {
    const result = computeScrollbarState({
      clientHeight: 0,
      scrollHeight: 100,
      scrollTop: 0,
    });

    expect(result).toBeNull();
  });

  it("computes thumb dimensions when content overflows", () => {
    const result = computeScrollbarState({
      clientHeight: 600,
      scrollHeight: 1200,
      scrollTop: 0,
    });

    expect(result).not.toBeNull();
    expect(result!.maxScrollTop).toBe(600);
    expect(result!.trackHeight).toBe(540); // 600 - 20 - 40
    expect(result!.thumbHeight).toBeGreaterThanOrEqual(40);
    expect(result!.thumbOffset).toBe(0);
  });

  it("positions the thumb proportionally to scroll position", () => {
    const atTop = computeScrollbarState({
      clientHeight: 600,
      scrollHeight: 1200,
      scrollTop: 0,
    });

    const atMiddle = computeScrollbarState({
      clientHeight: 600,
      scrollHeight: 1200,
      scrollTop: 300,
    });

    const atBottom = computeScrollbarState({
      clientHeight: 600,
      scrollHeight: 1200,
      scrollTop: 600,
    });

    expect(atTop!.thumbOffset).toBe(0);
    expect(atMiddle!.thumbOffset).toBeGreaterThan(0);
    expect(atMiddle!.thumbOffset).toBeLessThan(atBottom!.thumbOffset);
    expect(atBottom!.thumbOffset).toBe(
      atBottom!.trackHeight - atBottom!.thumbHeight,
    );
  });

  it("enforces a minimum thumb height", () => {
    const result = computeScrollbarState({
      clientHeight: 600,
      scrollHeight: 60000,
      scrollTop: 0,
    });

    expect(result!.thumbHeight).toBe(40);
  });
});

import { describe, expect, it } from "vitest";

import { computeScrollbarState, getNotebookScrollbarClassName } from "./NotebookScrollbar";

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
    expect(result!.dragTrackHeight).toBe(508); // 540 - (16 * 2)
    expect(result!.thumbHeight).toBeGreaterThanOrEqual(40);
    expect(result!.thumbOffset).toBe(16);
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

    expect(atTop!.thumbOffset).toBe(16);
    expect(atMiddle!.thumbOffset).toBeGreaterThan(0);
    expect(atMiddle!.thumbOffset).toBeLessThan(atBottom!.thumbOffset);
    expect(atBottom!.thumbOffset + atBottom!.thumbHeight).toBe(
      atBottom!.trackHeight - 16,
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

  it("returns the visible class path with active pointer events", () => {
    expect(getNotebookScrollbarClassName(true)).toContain("block");
    expect(getNotebookScrollbarClassName(true)).toContain("pointer-events-auto");
    expect(getNotebookScrollbarClassName(true)).toContain("opacity-100");
  });

  it("returns the hidden class path with disabled pointer events", () => {
    expect(getNotebookScrollbarClassName(false)).toContain("pointer-events-none");
    expect(getNotebookScrollbarClassName(false)).toContain("opacity-0");
    expect(getNotebookScrollbarClassName(false)).not.toContain("hidden lg:block");
    expect(getNotebookScrollbarClassName(false)).not.toContain("group-hover/notebook");
  });
});

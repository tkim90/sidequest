import { describe, expect, it } from "vitest";

import { createWindowRecord } from "./state";
import { getNextPanePlacement, getVisibleCanvasBounds } from "./panePlacement";

describe("getVisibleCanvasBounds", () => {
  it("accounts for viewport translation and zoom", () => {
    expect(
      getVisibleCanvasBounds({
        canvasHeight: 800,
        canvasWidth: 1000,
        viewport: {
          x: -200,
          y: -100,
          scale: 1,
          zoom: 2,
        },
      }),
    ).toEqual({
      left: 100,
      right: 600,
      top: 50,
      bottom: 450,
    });
  });
});

describe("getNextPanePlacement", () => {
  it("starts new panes inside the visible workspace inset", () => {
    expect(
      getNextPanePlacement({
        canvasHeight: 1800,
        canvasWidth: 2200,
        existingWindows: [],
        paneHeight: 1060,
        paneWidth: 860,
        viewport: {
          x: 0,
          y: 0,
          scale: 1,
          zoom: 1,
        },
      }),
    ).toEqual({
      x: 28,
      y: 36,
    });
  });

  it("places the next pane to the right when there is room", () => {
    const existingWindow = createWindowRecord({
      title: "Chat 2",
      x: 56,
      y: 72,
    });

    expect(
      getNextPanePlacement({
        canvasHeight: 2400,
        canvasWidth: 2200,
        existingWindows: [existingWindow],
        paneHeight: 1060,
        paneWidth: 860,
        viewport: {
          x: 0,
          y: 0,
          scale: 1,
          zoom: 1,
        },
      }),
    ).toEqual({
      x: 980,
      y: 72,
    });
  });

  it("wraps below the rightmost visible column when horizontal space runs out", () => {
    const existingWindow = createWindowRecord({
      title: "Chat 2",
      x: 56,
      y: 72,
    });

    expect(
      getNextPanePlacement({
        canvasHeight: 2400,
        canvasWidth: 1800,
        existingWindows: [existingWindow],
        paneHeight: 1060,
        paneWidth: 860,
        viewport: {
          x: 0,
          y: 0,
          scale: 1,
          zoom: 1,
        },
      }),
    ).toEqual({
      x: 56,
      y: 1196,
    });
  });

  it("keeps stacking below instead of overlapping when many notes already exist", () => {
    const firstWindow = createWindowRecord({
      title: "Chat 2",
      x: 56,
      y: 72,
    });
    const secondWindow = createWindowRecord({
      title: "Chat 3",
      x: 56,
      y: 1196,
    });

    expect(
      getNextPanePlacement({
        canvasHeight: 2400,
        canvasWidth: 1800,
        existingWindows: [firstWindow, secondWindow],
        paneHeight: 1060,
        paneWidth: 860,
        viewport: {
          x: 0,
          y: 0,
          scale: 1,
          zoom: 1,
        },
      }),
    ).toEqual({
      x: 56,
      y: 2320,
    });
  });

  it("ignores offscreen panes and uses only the visible viewport", () => {
    const offscreenWindow = createWindowRecord({
      title: "Chat 2",
      x: 56,
      y: 72,
    });

    expect(
      getNextPanePlacement({
        canvasHeight: 1800,
        canvasWidth: 1200,
        existingWindows: [offscreenWindow],
        paneHeight: 1060,
        paneWidth: 860,
        viewport: {
          x: -1000,
          y: 0,
          scale: 1,
          zoom: 1,
        },
      }),
    ).toEqual({
      x: 1028,
      y: 36,
    });
  });
});

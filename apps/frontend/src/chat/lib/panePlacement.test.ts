import { describe, expect, it } from "vitest";

import {
  FLOATING_ROOT_WINDOW_HEIGHT,
  FLOATING_ROOT_WINDOW_WIDTH,
} from "./constants";
import { createWindowRecord } from "./state";
import {
  getNextOverlappingPanePlacement,
  getNextPanePlacement,
  getVisibleCanvasBounds,
  resolveFloatingPaneSize,
} from "./panePlacement";

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

describe("resolveFloatingPaneSize", () => {
  it("keeps the default size when the safe area is large enough", () => {
    expect(
      resolveFloatingPaneSize({
        canvasHeight: 1800,
        canvasWidth: 2200,
        defaultHeight: FLOATING_ROOT_WINDOW_HEIGHT,
        defaultWidth: FLOATING_ROOT_WINDOW_WIDTH,
        viewport: {
          x: 0,
          y: 0,
          scale: 1,
          zoom: 1,
        },
      }),
    ).toEqual({
      height: FLOATING_ROOT_WINDOW_HEIGHT,
      width: FLOATING_ROOT_WINDOW_WIDTH,
    });
  });

  it("fits the note inside the visible safe area when the panel is too small", () => {
    expect(
      resolveFloatingPaneSize({
        canvasHeight: 400,
        canvasWidth: 420,
        defaultHeight: FLOATING_ROOT_WINDOW_HEIGHT,
        defaultWidth: FLOATING_ROOT_WINDOW_WIDTH,
        viewport: {
          x: 0,
          y: 0,
          scale: 1,
          zoom: 1,
        },
      }),
    ).toEqual({
      height: 328,
      width: 364,
    });
  });
});

describe("getNextOverlappingPanePlacement", () => {
  const viewport = {
    x: 0,
    y: 0,
    scale: 1,
    zoom: 1,
  } as const;

  it("starts the first note inside the visible safe bounds", () => {
    expect(
      getNextOverlappingPanePlacement({
        canvasHeight: 1800,
        canvasWidth: 2200,
        existingWindows: [],
        paneHeight: FLOATING_ROOT_WINDOW_HEIGHT,
        paneWidth: FLOATING_ROOT_WINDOW_WIDTH,
        viewport,
        rng: () => 0,
      }),
    ).toEqual({
      x: 28,
      y: 36,
    });
  });

  it("overlaps the latest visible note using bounded random offsets", () => {
    const existingWindow = createWindowRecord({
      title: "Chat 2",
      x: 100,
      y: 120,
      width: FLOATING_ROOT_WINDOW_WIDTH,
      height: FLOATING_ROOT_WINDOW_HEIGHT,
    });

    expect(
      getNextOverlappingPanePlacement({
        canvasHeight: 2400,
        canvasWidth: 2200,
        existingWindows: [existingWindow],
        paneHeight: FLOATING_ROOT_WINDOW_HEIGHT,
        paneWidth: FLOATING_ROOT_WINDOW_WIDTH,
        viewport,
        rng: () => 0,
      }),
    ).toEqual({
      x: 152,
      y: 170,
    });
  });

  it("mirrors placement when down-right would overflow the safe area", () => {
    const existingWindow = createWindowRecord({
      title: "Chat 2",
      x: 520,
      y: 530,
      width: 600,
      height: 400,
    });

    expect(
      getNextOverlappingPanePlacement({
        canvasHeight: 1000,
        canvasWidth: 1200,
        existingWindows: [existingWindow],
        paneHeight: 400,
        paneWidth: 600,
        viewport,
        rng: () => 1,
      }),
    ).toEqual({
      x: 388,
      y: 466,
    });
  });

  it("clamps placement when both the preferred and mirrored positions overflow", () => {
    const existingWindow = createWindowRecord({
      title: "Chat 2",
      x: 28,
      y: 36,
      width: 620,
      height: 300,
    });

    expect(
      getNextOverlappingPanePlacement({
        canvasHeight: 420,
        canvasWidth: 700,
        existingWindows: [existingWindow],
        paneHeight: 300,
        paneWidth: 620,
        viewport,
        rng: () => 1,
      }),
    ).toEqual({
      x: 52,
      y: 84,
    });
  });
});

import type { Viewport, WindowRecord } from "../../types";
import { getViewportEffectiveScale } from "../hooks/canvasUtils";
import { WINDOW_GAP } from "./constants";

const DEFAULT_INSET_X = 28;
const DEFAULT_INSET_Y = 36;
const COLUMN_ALIGNMENT_TOLERANCE = 24;
const PLACEMENT_GAP = WINDOW_GAP / 2;

interface VisibleCanvasBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface GetVisibleCanvasBoundsOptions {
  canvasHeight: number;
  canvasWidth: number;
  viewport: Viewport;
}

interface GetNextPanePlacementOptions {
  canvasHeight: number;
  canvasWidth: number;
  existingWindows: WindowRecord[];
  paneHeight: number;
  paneWidth: number;
  viewport: Viewport;
}

function clamp(value: number, min: number, max: number): number {
  if (max <= min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function intersects(bounds: VisibleCanvasBounds, windowData: WindowRecord): boolean {
  return (
    windowData.x < bounds.right &&
    windowData.x + windowData.width > bounds.left &&
    windowData.y < bounds.bottom &&
    windowData.y + windowData.height > bounds.top
  );
}

function overlaps(
  x: number,
  y: number,
  paneWidth: number,
  paneHeight: number,
  windowData: WindowRecord,
): boolean {
  return (
    x < windowData.x + windowData.width &&
    x + paneWidth > windowData.x &&
    y < windowData.y + windowData.height &&
    y + paneHeight > windowData.y
  );
}

function resolveNonOverlappingY(
  x: number,
  initialY: number,
  paneWidth: number,
  paneHeight: number,
  existingWindows: WindowRecord[],
): number {
  let nextY = initialY;

  while (true) {
    const overlappingWindows = existingWindows.filter((windowData) =>
      overlaps(x, nextY, paneWidth, paneHeight, windowData),
    );

    if (overlappingWindows.length === 0) {
      return nextY;
    }

    nextY = Math.max(
      ...overlappingWindows.map(
        (windowData) => windowData.y + windowData.height + PLACEMENT_GAP,
      ),
    );
  }
}

export function getVisibleCanvasBounds({
  canvasHeight,
  canvasWidth,
  viewport,
}: GetVisibleCanvasBoundsOptions): VisibleCanvasBounds {
  const effectiveScale = getViewportEffectiveScale(viewport) || 1;

  return {
    left: -viewport.x / effectiveScale,
    right: (-viewport.x + canvasWidth) / effectiveScale,
    top: -viewport.y / effectiveScale,
    bottom: (-viewport.y + canvasHeight) / effectiveScale,
  };
}

export function getNextPanePlacement({
  canvasHeight,
  canvasWidth,
  existingWindows,
  paneHeight,
  paneWidth,
  viewport,
}: GetNextPanePlacementOptions): Pick<WindowRecord, "x" | "y"> {
  const bounds = getVisibleCanvasBounds({
    canvasHeight,
    canvasWidth,
    viewport,
  });
  const safeLeft = bounds.left + DEFAULT_INSET_X;
  const safeTop = bounds.top + DEFAULT_INSET_Y;
  const maxX = Math.max(safeLeft, bounds.right - DEFAULT_INSET_X - paneWidth);
  const visibleWindows = existingWindows.filter((windowData) =>
    intersects(bounds, windowData),
  );

  if (visibleWindows.length === 0) {
    return {
      x: safeLeft,
      y: resolveNonOverlappingY(
        safeLeft,
        safeTop,
        paneWidth,
        paneHeight,
        existingWindows,
      ),
    };
  }

  const rightmostWindow = visibleWindows.reduce((bestWindow, windowData) => {
    const bestRight = bestWindow.x + bestWindow.width;
    const currentRight = windowData.x + windowData.width;

    if (currentRight !== bestRight) {
      return currentRight > bestRight ? windowData : bestWindow;
    }

    if (windowData.x !== bestWindow.x) {
      return windowData.x > bestWindow.x ? windowData : bestWindow;
    }

    return windowData.y < bestWindow.y ? windowData : bestWindow;
  });

  const rightPlacementX = rightmostWindow.x + rightmostWindow.width + PLACEMENT_GAP;
  const safeRight = bounds.right - DEFAULT_INSET_X;

  if (rightPlacementX + paneWidth <= safeRight) {
    const nextX = clamp(rightPlacementX, safeLeft, maxX);
    return {
      x: nextX,
      y: resolveNonOverlappingY(
        nextX,
        Math.max(safeTop, rightmostWindow.y),
        paneWidth,
        paneHeight,
        existingWindows,
      ),
    };
  }

  const alignedColumnWindows = visibleWindows.filter(
    (windowData) =>
      Math.abs(windowData.x - rightmostWindow.x) <= COLUMN_ALIGNMENT_TOLERANCE,
  );
  const columnBottom = Math.max(
    ...alignedColumnWindows.map((windowData) => windowData.y + windowData.height),
  );

  const nextX = clamp(rightmostWindow.x, safeLeft, maxX);

  return {
    x: nextX,
    y: resolveNonOverlappingY(
      nextX,
      Math.max(safeTop, columnBottom + PLACEMENT_GAP),
      paneWidth,
      paneHeight,
      existingWindows,
    ),
  };
}

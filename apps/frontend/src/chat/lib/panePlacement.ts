import type { Viewport, WindowRecord } from "../../types";
import { getViewportEffectiveScale } from "../hooks/canvasUtils";
import {
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  WINDOW_GAP,
} from "./constants";

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

interface VisibleSafeBounds extends VisibleCanvasBounds {
  safeBottom: number;
  safeHeight: number;
  safeLeft: number;
  safeRight: number;
  safeTop: number;
  safeWidth: number;
}

interface GetNextPanePlacementOptions {
  canvasHeight: number;
  canvasWidth: number;
  existingWindows: WindowRecord[];
  paneHeight: number;
  paneWidth: number;
  viewport: Viewport;
}

interface ResolveFloatingPaneSizeOptions {
  canvasHeight: number;
  canvasWidth: number;
  defaultHeight: number;
  defaultWidth: number;
  minHeight?: number;
  minWidth?: number;
  viewport: Viewport;
}

interface GetNextOverlappingPanePlacementOptions {
  canvasHeight: number;
  canvasWidth: number;
  existingWindows: WindowRecord[];
  paneHeight: number;
  paneWidth: number;
  viewport: Viewport;
  rng?: () => number;
}

interface FloatingPaneSize {
  height: number;
  width: number;
}

function clamp(value: number, min: number, max: number): number {
  if (max <= min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function randomBetween(min: number, max: number, rng: () => number): number {
  return min + (max - min) * rng();
}

function resolveAxisPosition(
  start: number,
  offset: number,
  min: number,
  max: number,
): number {
  const forward = start + offset;
  if (forward <= max) {
    return forward;
  }

  const mirrored = start - offset;
  if (mirrored >= min) {
    return mirrored;
  }

  return clamp(forward, min, max);
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

export function getVisibleSafeBounds({
  canvasHeight,
  canvasWidth,
  viewport,
}: GetVisibleCanvasBoundsOptions): VisibleSafeBounds {
  const bounds = getVisibleCanvasBounds({
    canvasHeight,
    canvasWidth,
    viewport,
  });
  const safeLeft = bounds.left + DEFAULT_INSET_X;
  const safeTop = bounds.top + DEFAULT_INSET_Y;
  const safeRight = Math.max(safeLeft, bounds.right - DEFAULT_INSET_X);
  const safeBottom = Math.max(safeTop, bounds.bottom - DEFAULT_INSET_Y);

  return {
    ...bounds,
    safeBottom,
    safeHeight: Math.max(1, safeBottom - safeTop),
    safeLeft,
    safeRight,
    safeTop,
    safeWidth: Math.max(1, safeRight - safeLeft),
  };
}

export function resolveFloatingPaneSize({
  canvasHeight,
  canvasWidth,
  defaultHeight,
  defaultWidth,
  minHeight = MIN_WINDOW_HEIGHT,
  minWidth = MIN_WINDOW_WIDTH,
  viewport,
}: ResolveFloatingPaneSizeOptions): FloatingPaneSize {
  const safeBounds = getVisibleSafeBounds({
    canvasHeight,
    canvasWidth,
    viewport,
  });

  const width =
    safeBounds.safeWidth >= minWidth
      ? Math.min(defaultWidth, safeBounds.safeWidth)
      : safeBounds.safeWidth;
  const height =
    safeBounds.safeHeight >= minHeight
      ? Math.min(defaultHeight, safeBounds.safeHeight)
      : safeBounds.safeHeight;

  return {
    height: Math.max(1, Math.floor(height)),
    width: Math.max(1, Math.floor(width)),
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
  const bounds = getVisibleSafeBounds({
    canvasHeight,
    canvasWidth,
    viewport,
  });
  const safeLeft = bounds.safeLeft;
  const safeTop = bounds.safeTop;
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

export function getNextOverlappingPanePlacement({
  canvasHeight,
  canvasWidth,
  existingWindows,
  paneHeight,
  paneWidth,
  viewport,
  rng = Math.random,
}: GetNextOverlappingPanePlacementOptions): Pick<WindowRecord, "x" | "y"> {
  const bounds = getVisibleSafeBounds({
    canvasHeight,
    canvasWidth,
    viewport,
  });
  const maxX = Math.max(bounds.safeLeft, bounds.safeRight - paneWidth);
  const maxY = Math.max(bounds.safeTop, bounds.safeBottom - paneHeight);
  const visibleWindows = existingWindows.filter((windowData) =>
    intersects(bounds, windowData),
  );

  if (visibleWindows.length === 0) {
    return {
      x: bounds.safeLeft,
      y: bounds.safeTop,
    };
  }

  const referenceWindow = visibleWindows[visibleWindows.length - 1];
  const offsetX = Math.round(paneWidth * randomBetween(0.12, 0.22, rng));
  const offsetY = Math.round(paneHeight * randomBetween(0.08, 0.16, rng));

  return {
    x: clamp(
      resolveAxisPosition(referenceWindow.x, offsetX, bounds.safeLeft, maxX),
      bounds.safeLeft,
      maxX,
    ),
    y: clamp(
      resolveAxisPosition(referenceWindow.y, offsetY, bounds.safeTop, maxY),
      bounds.safeTop,
      maxY,
    ),
  };
}

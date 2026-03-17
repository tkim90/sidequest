import {
  DEFAULT_LEFT_PANE_RATIO,
  MIN_LEFT_PANE_WIDTH,
  MIN_RIGHT_PANE_WIDTH,
  PANE_SEPARATOR_WIDTH,
} from "./constants";

export function clampLeftPaneWidth(
  leftPaneWidth: number,
  containerWidth: number,
): number {
  const availableWidth = Math.max(0, containerWidth - PANE_SEPARATOR_WIDTH);
  if (availableWidth <= MIN_LEFT_PANE_WIDTH + MIN_RIGHT_PANE_WIDTH) {
    return Math.max(0, Math.round(availableWidth / 2));
  }

  const maxLeftPaneWidth = availableWidth - MIN_RIGHT_PANE_WIDTH;
  return Math.min(
    Math.max(leftPaneWidth, MIN_LEFT_PANE_WIDTH),
    maxLeftPaneWidth,
  );
}

export function getDefaultLeftPaneWidth(containerWidth: number): number {
  return clampLeftPaneWidth(
    Math.round(containerWidth * DEFAULT_LEFT_PANE_RATIO),
    containerWidth,
  );
}

export function resolveStoredLeftPaneWidth(
  storedLeftPaneWidth: string | null,
  containerWidth: number,
): number {
  const parsedWidth = Number(storedLeftPaneWidth);
  if (!Number.isFinite(parsedWidth) || parsedWidth <= 0) {
    return getDefaultLeftPaneWidth(containerWidth);
  }

  return clampLeftPaneWidth(parsedWidth, containerWidth);
}

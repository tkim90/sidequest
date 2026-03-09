import type { ConnectorPath } from "../../types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getConnectorPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): string {
  const curve = Math.max(96, Math.abs(endX - startX) * 0.35);
  return [
    `M ${startX} ${startY}`,
    `C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`,
  ].join(" ");
}

export function areConnectorPathsEqual(
  previousPaths: ConnectorPath[],
  nextPaths: ConnectorPath[],
): boolean {
  if (previousPaths.length !== nextPaths.length) {
    return false;
  }

  return previousPaths.every((path, index) => {
    const nextPath = nextPaths[index];
    return path.id === nextPath.id && path.path === nextPath.path;
  });
}

export function findTextOffsets(
  container: Node,
  range: Range,
): {
  selectedText: string;
  startOffset: number;
  endOffset: number;
} {
  const prefixRange = range.cloneRange();
  prefixRange.selectNodeContents(container);
  prefixRange.setEnd(range.startContainer, range.startOffset);

  const startOffset = prefixRange.toString().length;
  const selectedText = range.toString();

  return {
    selectedText,
    startOffset,
    endOffset: startOffset + selectedText.length,
  };
}

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

export function getRangeWithinContainer(
  container: Node,
  range: Range,
): Range | null {
  const startsInside = container.contains(range.startContainer);
  const endsInside = container.contains(range.endContainer);
  const intersects = startsInside || endsInside || range.intersectsNode(container);

  if (!intersects) {
    return null;
  }

  const constrainedRange = range.cloneRange();

  if (!startsInside) {
    constrainedRange.setStart(container, 0);
  }

  if (!endsInside) {
    constrainedRange.setEnd(container, container.childNodes.length);
  }

  return constrainedRange;
}

export function getRangeRect(range: Range): DOMRect | null {
  const primaryRect = range.getBoundingClientRect();

  if (primaryRect.width > 0 || primaryRect.height > 0) {
    return primaryRect;
  }

  const clientRects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 || rect.height > 0,
  );

  if (clientRects.length === 0) {
    return null;
  }

  let left = clientRects[0].left;
  let top = clientRects[0].top;
  let right = clientRects[0].right;
  let bottom = clientRects[0].bottom;

  clientRects.slice(1).forEach((rect) => {
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  });

  return new DOMRect(left, top, right - left, bottom - top);
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

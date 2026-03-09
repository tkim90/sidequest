import { useEffect, useState, type RefObject } from "react";

import type { AnchorMap, ConnectorPath, MessagesByWindowId, Viewport, WindowMap } from "../../types";
import { clamp, getConnectorPath, areConnectorPathsEqual } from "../lib/geometry";

interface UseConnectorPathsOptions {
  anchorRefs: RefObject<Record<string, HTMLSpanElement>>;
  anchors: AnchorMap;
  canvasRef: RefObject<HTMLDivElement | null>;
  geometryVersion: number;
  messagesByWindowId: MessagesByWindowId;
  viewport: Viewport;
  windowRefs: RefObject<Record<string, HTMLElement>>;
  windows: WindowMap;
  zOrder: string[];
}

export function useConnectorPaths({
  anchorRefs,
  anchors,
  canvasRef,
  geometryVersion,
  messagesByWindowId,
  viewport,
  windowRefs,
  windows,
  zOrder,
}: UseConnectorPathsOptions): ConnectorPath[] {
  const [connectorPaths, setConnectorPaths] = useState<ConnectorPath[]>([]);

  useEffect(() => {
    const canvasNode = canvasRef.current;
    if (!canvasNode) {
      return;
    }

    const canvasRect = canvasNode.getBoundingClientRect();
    const connectorInset = 48;
    const nextPaths = Object.values(anchors)
      .map((anchor) => {
        const anchorNode = anchorRefs.current[anchor.groupKey];
        const parentWindowNode = windowRefs.current[anchor.parentWindowId];
        const childWindowNode = windowRefs.current[anchor.childWindowId];

        if (!anchorNode || !parentWindowNode || !childWindowNode) {
          return null;
        }

        const anchorRect = anchorNode.getBoundingClientRect();
        const parentRect = parentWindowNode.getBoundingClientRect();
        const childRect = childWindowNode.getBoundingClientRect();

        const startX = parentRect.right - canvasRect.left;
        const startAnchorY = anchorRect.top + anchorRect.height / 2 - canvasRect.top;
        const startMinY = parentRect.top + connectorInset - canvasRect.top;
        const startMaxY = parentRect.bottom - connectorInset - canvasRect.top;
        const startY = clamp(startAnchorY, startMinY, startMaxY);
        const endX = childRect.left - canvasRect.left;
        const endMinY = childRect.top + connectorInset - canvasRect.top;
        const endMaxY = childRect.bottom - connectorInset - canvasRect.top;
        const endY = clamp(startY, endMinY, endMaxY);

        return {
          id: anchor.id,
          path: getConnectorPath(startX, startY, endX, endY),
        };
      })
      .filter((path): path is ConnectorPath => path !== null);

    setConnectorPaths((current) =>
      areConnectorPathsEqual(current, nextPaths) ? current : nextPaths,
    );
  }, [
    anchors,
    anchorRefs,
    canvasRef,
    geometryVersion,
    messagesByWindowId,
    viewport,
    windowRefs,
    windows,
    zOrder,
  ]);

  return connectorPaths;
}

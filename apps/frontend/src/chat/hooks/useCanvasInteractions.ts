import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction,
} from "react";

import type {
  AnchorGroupsByMessageKey,
  AppState,
  ConnectorPath,
} from "../../types";
import { groupAnchorsByMessage } from "../lib/anchors";
import {
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
} from "../lib/constants";
import {
  areConnectorPathsEqual,
  clamp,
  getConnectorPath,
} from "../lib/geometry";

interface UseCanvasInteractionsOptions {
  appState: AppState;
  appStateRef: RefObject<AppState>;
  setAppState: Dispatch<SetStateAction<AppState>>;
}

interface UseCanvasInteractionsResult {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  canvasRef: RefObject<HTMLDivElement | null>;
  connectorPaths: ConnectorPath[];
  onCanvasPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onHeaderPointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    windowId: string,
  ) => void;
  onResizePointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    windowId: string,
    edges: ResizeEdges,
  ) => void;
  onWindowFocus: (windowId: string) => void;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  registerWindowRef: (windowId: string, node: HTMLElement | null) => void;
  requestGeometryRefresh: () => void;
  windowRefs: RefObject<Record<string, HTMLElement>>;
}

export interface ResizeEdges {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

type CanvasInteraction =
  | {
      type: "pan";
      startClientX: number;
      startClientY: number;
      startViewportX: number;
      startViewportY: number;
    }
  | {
      type: "drag";
      windowId: string;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      scale: number;
    }
  | {
      type: "resize";
      windowId: string;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
      startWidth: number;
      startHeight: number;
      scale: number;
      edges: ResizeEdges;
    };

export function useCanvasInteractions({
  appState,
  appStateRef,
  setAppState,
}: UseCanvasInteractionsOptions): UseCanvasInteractionsResult {
  const [connectorPaths, setConnectorPaths] = useState<ConnectorPath[]>([]);
  const [geometryVersion, setGeometryVersion] = useState(0);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const windowRefs = useRef<Record<string, HTMLElement>>({});
  const anchorRefs = useRef<Record<string, HTMLSpanElement>>({});
  const interactionRef = useRef<CanvasInteraction | null>(null);

  const requestGeometryRefresh = useCallback((): void => {
    setGeometryVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    function handlePointerMove(event: globalThis.PointerEvent): void {
      const interaction = interactionRef.current;
      if (!interaction) {
        return;
      }

      if (interaction.type === "pan") {
        const dx = event.clientX - interaction.startClientX;
        const dy = event.clientY - interaction.startClientY;

        setAppState((current) => ({
          ...current,
          viewport: {
            ...current.viewport,
            x: interaction.startViewportX + dx,
            y: interaction.startViewportY + dy,
          },
        }));
        return;
      }

      const dx = (event.clientX - interaction.startClientX) / interaction.scale;
      const dy = (event.clientY - interaction.startClientY) / interaction.scale;

      setAppState((current) => {
        const windowData = current.windows[interaction.windowId];
        if (!windowData) {
          return current;
        }

        if (interaction.type === "drag") {
          return {
            ...current,
            windows: {
              ...current.windows,
              [interaction.windowId]: {
                ...windowData,
                x: interaction.startX + dx,
                y: interaction.startY + dy,
              },
            },
          };
        }

        let nextX = interaction.startX;
        let nextY = interaction.startY;
        let nextWidth = interaction.startWidth;
        let nextHeight = interaction.startHeight;

        if (interaction.edges.east) {
          nextWidth = Math.max(
            MIN_WINDOW_WIDTH,
            interaction.startWidth + dx,
          );
        }

        if (interaction.edges.south) {
          nextHeight = Math.max(
            MIN_WINDOW_HEIGHT,
            interaction.startHeight + dy,
          );
        }

        if (interaction.edges.west) {
          nextWidth = Math.max(
            MIN_WINDOW_WIDTH,
            interaction.startWidth - dx,
          );
          nextX = interaction.startX + (interaction.startWidth - nextWidth);
        }

        if (interaction.edges.north) {
          nextHeight = Math.max(
            MIN_WINDOW_HEIGHT,
            interaction.startHeight - dy,
          );
          nextY = interaction.startY + (interaction.startHeight - nextHeight);
        }

        return {
          ...current,
          windows: {
            ...current.windows,
            [interaction.windowId]: {
              ...windowData,
              x: nextX,
              y: nextY,
              width: nextWidth,
              height: nextHeight,
            },
          },
        };
      });
    }

    function handlePointerUp(): void {
      if (interactionRef.current) {
        interactionRef.current = null;
        requestGeometryRefresh();
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [requestGeometryRefresh, setAppState]);

  useEffect(() => {
    function handleWindowResize(): void {
      requestGeometryRefresh();
    }

    window.addEventListener("resize", handleWindowResize);
    return () => {
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [requestGeometryRefresh]);

  useEffect(() => {
    const canvasNode = canvasRef.current;
    if (!canvasNode) {
      return undefined;
    }
    const sceneNode = canvasNode;

    function handleCanvasWheel(event: WheelEvent): void {
      const target = event.target instanceof Element ? event.target : null;
      const isModifierZoom = event.ctrlKey || event.metaKey;

      if (isModifierZoom) {
        event.preventDefault();

        const rect = sceneNode.getBoundingClientRect();
        const currentViewport = appStateRef.current.viewport;
        const pointerX = event.clientX - rect.left;
        const pointerY = event.clientY - rect.top;
        const contentX = (pointerX - currentViewport.x) / currentViewport.scale;
        const contentY = (pointerY - currentViewport.y) / currentViewport.scale;
        const zoomFactor = event.deltaY < 0 ? 1.08 : 0.92;
        const nextScale = clamp(currentViewport.scale * zoomFactor, 0.55, 1.5);

        setAppState((current) => ({
          ...current,
          viewport: {
            scale: nextScale,
            x: pointerX - contentX * nextScale,
            y: pointerY - contentY * nextScale,
          },
        }));
        return;
      }

      if (!target?.closest("[data-chat-window]")) {
        event.preventDefault();

        setAppState((current) => ({
          ...current,
          viewport: {
            ...current.viewport,
            x: current.viewport.x - event.deltaX,
            y: current.viewport.y - event.deltaY,
          },
        }));
      }
    }

    sceneNode.addEventListener("wheel", handleCanvasWheel, { passive: false });

    return () => {
      sceneNode.removeEventListener("wheel", handleCanvasWheel);
    };
  }, [appStateRef, setAppState]);

  const anchorGroupsByMessageKey = groupAnchorsByMessage(appState.anchors);

  useEffect(() => {
    const canvasNode = canvasRef.current;
    if (!canvasNode) {
      return;
    }

    const canvasRect = canvasNode.getBoundingClientRect();
    const nextPaths = Object.values(appState.anchors)
      .map((anchor) => {
        const anchorNode = anchorRefs.current[anchor.groupKey];
        const childWindowNode = windowRefs.current[anchor.childWindowId];

        if (!anchorNode || !childWindowNode) {
          return null;
        }

        const anchorRect = anchorNode.getBoundingClientRect();
        const childRect = childWindowNode.getBoundingClientRect();

        const startX = anchorRect.right - canvasRect.left;
        const startY = anchorRect.top + anchorRect.height / 2 - canvasRect.top;
        const endX = childRect.left - canvasRect.left;
        const minY = childRect.top + 48 - canvasRect.top;
        const maxY = childRect.bottom - 48 - canvasRect.top;
        const endY = clamp(startY, minY, maxY);

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
    appState.anchors,
    appState.messagesByWindowId,
    appState.viewport,
    appState.windows,
    appState.zOrder,
    geometryVersion,
  ]);

  function registerWindowRef(windowId: string, node: HTMLElement | null): void {
    if (node) {
      windowRefs.current[windowId] = node;
      return;
    }

    delete windowRefs.current[windowId];
  }

  function registerAnchorRef(
    groupKey: string,
    node: HTMLSpanElement | null,
  ): void {
    if (node) {
      anchorRefs.current[groupKey] = node;
      return;
    }

    delete anchorRefs.current[groupKey];
  }

  function bringWindowToFront(windowId: string): void {
    setAppState((current) => {
      if (!current.windows[windowId]) {
        return current;
      }

      return {
        ...current,
        zOrder: [
          ...current.zOrder.filter((candidateId) => candidateId !== windowId),
          windowId,
        ],
      };
    });
  }

  function handleCanvasPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ): void {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("[data-chat-window]")) {
      return;
    }

    interactionRef.current = {
      type: "pan",
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewportX: appStateRef.current.viewport.x,
      startViewportY: appStateRef.current.viewport.y,
    };
  }

  function handleHeaderPointerDown(
    event: ReactPointerEvent<HTMLElement>,
    windowId: string,
  ): void {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    bringWindowToFront(windowId);

    const windowData = appStateRef.current.windows[windowId];
    if (!windowData) {
      return;
    }

    interactionRef.current = {
      type: "drag",
      windowId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: windowData.x,
      startY: windowData.y,
      scale: appStateRef.current.viewport.scale,
    };
  }

  function handleResizePointerDown(
    event: ReactPointerEvent<HTMLElement>,
    windowId: string,
    edges: ResizeEdges,
  ): void {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    bringWindowToFront(windowId);

    const windowData = appStateRef.current.windows[windowId];
    if (!windowData) {
      return;
    }

    interactionRef.current = {
      type: "resize",
      windowId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: windowData.x,
      startY: windowData.y,
      startWidth: windowData.width,
      startHeight: windowData.height,
      scale: appStateRef.current.viewport.scale,
      edges,
    };
  }

  return {
    anchorGroupsByMessageKey,
    canvasRef,
    connectorPaths,
    onCanvasPointerDown: handleCanvasPointerDown,
    onHeaderPointerDown: handleHeaderPointerDown,
    onResizePointerDown: handleResizePointerDown,
    onWindowFocus: bringWindowToFront,
    registerAnchorRef,
    registerWindowRef,
    requestGeometryRefresh,
    windowRefs,
  };
}

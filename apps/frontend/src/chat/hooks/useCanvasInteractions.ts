import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import type {
  AnchorGroupsByMessageKey,
  AppState,
  ConnectorPath,
} from "../../types";
import { groupAnchorsByMessage } from "../lib/anchors";
import type { ResizeEdges } from "./canvasTypes";
import { useConnectorPaths } from "./useConnectorPaths";
import { usePointerInteractions } from "./usePointerInteractions";
import { useViewportWheel } from "./useViewportWheel";

interface UseCanvasInteractionsOptions {
  appState: AppState;
  appStateRef: RefObject<AppState>;
  setAppState: Dispatch<SetStateAction<AppState>>;
}

interface UseCanvasInteractionsResult {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  canvasRef: RefObject<HTMLDivElement | null>;
  connectorPaths: ConnectorPath[];
  onCanvasPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onHeaderPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
  ) => void;
  onResizePointerDown: (
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
    edges: ResizeEdges,
  ) => void;
  onWindowFocus: (windowId: string) => void;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  registerWindowRef: (windowId: string, node: HTMLElement | null) => void;
  requestGeometryRefresh: () => void;
  windowRefs: RefObject<Record<string, HTMLElement>>;
}

export type { ResizeEdges } from "./canvasTypes";

export function useCanvasInteractions({
  appState,
  appStateRef,
  setAppState,
}: UseCanvasInteractionsOptions): UseCanvasInteractionsResult {
  const [geometryVersion, setGeometryVersion] = useState(0);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const windowRefs = useRef<Record<string, HTMLElement>>({});
  const anchorRefs = useRef<Record<string, HTMLSpanElement>>({});
  const geometryRefreshFrameRef = useRef<number | null>(null);

  const requestGeometryRefresh = useCallback(() => {
    if (typeof window === "undefined") {
      setGeometryVersion((version) => version + 1);
      return;
    }

    if (geometryRefreshFrameRef.current !== null) {
      return;
    }

    geometryRefreshFrameRef.current = window.requestAnimationFrame(() => {
      geometryRefreshFrameRef.current = null;
      setGeometryVersion((version) => version + 1);
    });
  }, []);

  useEffect(
    () => () => {
      if (geometryRefreshFrameRef.current !== null) {
        window.cancelAnimationFrame(geometryRefreshFrameRef.current);
        geometryRefreshFrameRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    function handleWindowResize(): void {
      requestGeometryRefresh();
    }

    window.addEventListener("resize", handleWindowResize);
    return () => {
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [requestGeometryRefresh]);

  useViewportWheel({
    appStateRef,
    canvasRef,
    setAppState,
  });

  const pointerInteractions = usePointerInteractions({
    appStateRef,
    requestGeometryRefresh,
    setAppState,
  });

  const anchorGroupsByMessageKey = useMemo(
    () => groupAnchorsByMessage(appState.anchors),
    [appState.anchors],
  );

  const connectorPaths = useConnectorPaths({
    anchorRefs,
    anchors: appState.anchors,
    canvasRef,
    geometryVersion,
    viewport: appState.viewport,
    windowRefs,
    windows: appState.windows,
    zOrder: appState.zOrder,
  });

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

  return {
    anchorGroupsByMessageKey,
    canvasRef,
    connectorPaths,
    onCanvasPointerDown: pointerInteractions.onCanvasPointerDown,
    onHeaderPointerDown: pointerInteractions.onHeaderPointerDown,
    onResizePointerDown: pointerInteractions.onResizePointerDown,
    onWindowFocus: pointerInteractions.onWindowFocus,
    registerAnchorRef,
    registerWindowRef,
    requestGeometryRefresh,
    windowRefs,
  };
}

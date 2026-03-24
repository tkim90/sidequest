import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import { useMountEffect } from "../../hooks/useMountEffect";
import type {
  AnchorGroupsByMessageKey,
  AppState,
} from "../../types";
import { groupAnchorsByMessage } from "../lib/anchors";
import type { ResizeEdges } from "./canvasTypes";
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
  getAnchorNode: (groupKey: string) => HTMLSpanElement | null;
  onCanvasPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onCanvasWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
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

  useMountEffect(
    () => () => {
      if (geometryRefreshFrameRef.current !== null) {
        window.cancelAnimationFrame(geometryRefreshFrameRef.current);
        geometryRefreshFrameRef.current = null;
      }
    },
  );

  useMountEffect(() => {
    function handleWindowResize(): void {
      requestGeometryRefresh();
    }

    window.addEventListener("resize", handleWindowResize);
    return () => {
      window.removeEventListener("resize", handleWindowResize);
    };
  });

  const onCanvasWheel = useViewportWheel({
    appStateRef,
    setAppState,
  });
  const pointerInteractions = usePointerInteractions({
    appStateRef,
    canvasRef,
    requestGeometryRefresh,
    setAppState,
    viewport: appState.viewport,
  });

  const anchorGroupsByMessageKey = useMemo(
    () => groupAnchorsByMessage(appState.anchors),
    [appState.anchors],
  );

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
    getAnchorNode: (groupKey) => anchorRefs.current[groupKey] ?? null,
    onCanvasPointerDown: pointerInteractions.onCanvasPointerDown,
    onCanvasWheel,
    onHeaderPointerDown: pointerInteractions.onHeaderPointerDown,
    onResizePointerDown: pointerInteractions.onResizePointerDown,
    onWindowFocus: pointerInteractions.onWindowFocus,
    registerAnchorRef,
    registerWindowRef,
    requestGeometryRefresh,
    windowRefs,
  };
}

import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction,
} from "react";

import type { AppState } from "../../types";
import {
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
} from "../lib/constants";
import { clamp } from "../lib/geometry";
import { getViewportEffectiveScale } from "./canvasUtils";
import type { CanvasInteraction, ResizeEdges } from "./canvasTypes";

interface UsePointerInteractionsOptions {
  appStateRef: RefObject<AppState>;
  canvasRef: RefObject<HTMLDivElement | null>;
  requestGeometryRefresh: () => void;
  setAppState: Dispatch<SetStateAction<AppState>>;
}

export function usePointerInteractions({
  appStateRef,
  canvasRef,
  requestGeometryRefresh,
  setAppState,
}: UsePointerInteractionsOptions) {
  const interactionRef = useRef<CanvasInteraction | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ clientX: number; clientY: number } | null>(
    null,
  );

  const applyPendingInteraction = useCallback(() => {
    const interaction = interactionRef.current;
    const pendingPointer = pendingPointerRef.current;
    if (!interaction || !pendingPointer) {
      return;
    }

    pendingPointerRef.current = null;

    const dx = (pendingPointer.clientX - interaction.startClientX) / interaction.scale;
    const dy = (pendingPointer.clientY - interaction.startClientY) / interaction.scale;

    setAppState((current) => {
      const windowData = current.windows[interaction.windowId];
      if (!windowData) {
        return current;
      }

      if (interaction.type === "drag") {
        const canvasNode = canvasRef.current;
        const effectiveScale = getViewportEffectiveScale(current.viewport) || 1;
        const boundsLeft = -current.viewport.x / effectiveScale;
        const boundsTop = -current.viewport.y / effectiveScale;
        const boundsRight = canvasNode
          ? (-current.viewport.x + canvasNode.clientWidth) / effectiveScale
          : Number.POSITIVE_INFINITY;
        const boundsBottom = canvasNode
          ? (-current.viewport.y + canvasNode.clientHeight) / effectiveScale
          : Number.POSITIVE_INFINITY;
        const maxX = Math.max(boundsLeft, boundsRight - windowData.width);
        const maxY = Math.max(boundsTop, boundsBottom - windowData.height);

        return {
          ...current,
          windows: {
            ...current.windows,
            [interaction.windowId]: {
              ...windowData,
              x: clamp(interaction.startX + dx, boundsLeft, maxX),
              y: clamp(interaction.startY + dy, boundsTop, maxY),
            },
          },
        };
      }

      let nextX = interaction.startX;
      let nextY = interaction.startY;
      let nextWidth = interaction.startWidth;
      let nextHeight = interaction.startHeight;

      if (interaction.edges.east) {
        nextWidth = Math.max(MIN_WINDOW_WIDTH, interaction.startWidth + dx);
      }
      if (interaction.edges.south) {
        nextHeight = Math.max(MIN_WINDOW_HEIGHT, interaction.startHeight + dy);
      }
      if (interaction.edges.west) {
        nextWidth = Math.max(MIN_WINDOW_WIDTH, interaction.startWidth - dx);
        nextX = interaction.startX + (interaction.startWidth - nextWidth);
      }
      if (interaction.edges.north) {
        nextHeight = Math.max(MIN_WINDOW_HEIGHT, interaction.startHeight - dy);
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
  }, [canvasRef, setAppState]);

  const scheduleInteractionFrame = useCallback(() => {
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      applyPendingInteraction();
    });
  }, [applyPendingInteraction]);

  const flushPendingInteraction = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    applyPendingInteraction();
  }, [applyPendingInteraction]);

  useEffect(() => {
    function handlePointerMove(event: globalThis.PointerEvent): void {
      const interaction = interactionRef.current;
      if (!interaction) {
        return;
      }

      pendingPointerRef.current = {
        clientX: event.clientX,
        clientY: event.clientY,
      };
      scheduleInteractionFrame();
    }

    function handlePointerUp(): void {
      if (interactionRef.current) {
        flushPendingInteraction();
        interactionRef.current = null;
        pendingPointerRef.current = null;
        requestGeometryRefresh();
      }
    }

    function handlePointerCancel(): void {
      handlePointerUp();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [flushPendingInteraction, requestGeometryRefresh, scheduleInteractionFrame]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );

  const bringWindowToFront = useCallback(
    (windowId: string) => {
      setAppState((current) => {
        const targetWindow = current.windows[windowId];
        if (!targetWindow) {
          return current;
        }

        const pinnedMainWindowId = current.zOrder.find((candidateId) => {
          const candidateWindow = current.windows[candidateId];
          return candidateWindow?.parentId === null;
        });
        if (pinnedMainWindowId === windowId) {
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
    },
    [setAppState],
  );

  function onCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("[data-chat-window]")) {
      return;
    }
  }

  function onHeaderPointerDown(
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
      scale: getViewportEffectiveScale(appStateRef.current.viewport),
    };
  }

  function onResizePointerDown(
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
      scale: getViewportEffectiveScale(appStateRef.current.viewport),
      edges,
    };
  }

  return {
    onCanvasPointerDown,
    onHeaderPointerDown,
    onResizePointerDown,
    onWindowFocus: bringWindowToFront,
  };
}

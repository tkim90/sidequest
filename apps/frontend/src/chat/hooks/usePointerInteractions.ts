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
import { getViewportEffectiveScale } from "./canvasUtils";
import type { CanvasInteraction, ResizeEdges } from "./canvasTypes";

interface UsePointerInteractionsOptions {
  appStateRef: RefObject<AppState>;
  requestGeometryRefresh: () => void;
  setAppState: Dispatch<SetStateAction<AppState>>;
}

export function usePointerInteractions({
  appStateRef,
  requestGeometryRefresh,
  setAppState,
}: UsePointerInteractionsOptions) {
  const interactionRef = useRef<CanvasInteraction | null>(null);

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

  const bringWindowToFront = useCallback(
    (windowId: string) => {
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
    },
    [setAppState],
  );

  function onCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
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

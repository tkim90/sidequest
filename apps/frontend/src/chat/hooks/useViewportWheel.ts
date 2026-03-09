import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";

import type { AppState } from "../../types";
import {
  MAX_VIEWPORT_ZOOM,
  MIN_VIEWPORT_ZOOM,
  ZOOM_COMMIT_DELAY_MS,
} from "../lib/constants";
import { clamp } from "../lib/geometry";
import { getViewportEffectiveScale } from "./canvasUtils";

interface UseViewportWheelOptions {
  appStateRef: RefObject<AppState>;
  canvasRef: RefObject<HTMLDivElement | null>;
  clearZoomCommitTimer: () => void;
  commitViewportZoom: () => void;
  setAppState: Dispatch<SetStateAction<AppState>>;
  zoomCommitTimerRef: MutableRefObject<number | null>;
}

export function useViewportWheel({
  appStateRef,
  canvasRef,
  clearZoomCommitTimer,
  commitViewportZoom,
  setAppState,
  zoomCommitTimerRef,
}: UseViewportWheelOptions): void {
  useEffect(() => {
    const canvasNode = canvasRef.current;
    if (!canvasNode) {
      return;
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
        const currentScale = getViewportEffectiveScale(currentViewport);
        const contentX = (pointerX - currentViewport.x) / currentScale;
        const contentY = (pointerY - currentViewport.y) / currentScale;
        const zoomFactor = event.deltaY < 0 ? 1.08 : 0.92;
        const nextScale = clamp(
          currentScale * zoomFactor,
          MIN_VIEWPORT_ZOOM,
          MAX_VIEWPORT_ZOOM,
        );

        clearZoomCommitTimer();

        setAppState((current) => ({
          ...current,
          viewport: {
            ...current.viewport,
            scale: nextScale / current.viewport.zoom,
            x: pointerX - contentX * nextScale,
            y: pointerY - contentY * nextScale,
          },
        }));

        zoomCommitTimerRef.current = window.setTimeout(
          commitViewportZoom,
          ZOOM_COMMIT_DELAY_MS,
        );
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
  }, [
    appStateRef,
    canvasRef,
    clearZoomCommitTimer,
    commitViewportZoom,
    setAppState,
    zoomCommitTimerRef,
  ]);
}

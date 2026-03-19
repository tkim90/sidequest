import {
  useEffect,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import type { AppState } from "../../types";
import {
  MAX_VIEWPORT_ZOOM,
  MIN_VIEWPORT_ZOOM,
} from "../lib/constants";
import { clamp } from "../lib/geometry";
import { getViewportEffectiveScale } from "./canvasUtils";

interface UseViewportWheelOptions {
  appStateRef: RefObject<AppState>;
  canvasRef: RefObject<HTMLDivElement | null>;
  setAppState: Dispatch<SetStateAction<AppState>>;
}

export function useViewportWheel({
  appStateRef,
  canvasRef,
  setAppState,
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

        setAppState((current) => ({
          ...current,
          viewport: {
            ...current.viewport,
            zoom: nextScale,
            scale: 1,
            x: pointerX - contentX * nextScale,
            y: pointerY - contentY * nextScale,
          },
        }));
        return;
      }

      if (!target?.closest("[data-chat-window]")) {
        event.preventDefault();
      }
    }

    sceneNode.addEventListener("wheel", handleCanvasWheel, { passive: false });
    return () => {
      sceneNode.removeEventListener("wheel", handleCanvasWheel);
    };
  }, [appStateRef, canvasRef, setAppState]);
}

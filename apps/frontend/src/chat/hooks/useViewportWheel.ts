import {
  type WheelEvent as ReactWheelEvent,
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
  setAppState: Dispatch<SetStateAction<AppState>>;
}

export function getNextViewportZoomScale(
  currentScale: number,
  deltaY: number,
): number {
  const zoomFactor = deltaY < 0 ? 1.08 : 0.92;

  return clamp(
    currentScale * zoomFactor,
    MIN_VIEWPORT_ZOOM,
    MAX_VIEWPORT_ZOOM,
  );
}

export function useViewportWheel({
  appStateRef,
  setAppState,
}: UseViewportWheelOptions) {
  return function handleCanvasWheel(
    event: ReactWheelEvent<HTMLDivElement>,
  ): void {
    const target = event.target instanceof Element ? event.target : null;
    const isModifierZoom = event.ctrlKey || event.metaKey;

    if (isModifierZoom) {
      event.preventDefault();

      const rect = event.currentTarget.getBoundingClientRect();
      const currentViewport = appStateRef.current.viewport;
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const currentScale = getViewportEffectiveScale(currentViewport);
      const contentX = (pointerX - currentViewport.x) / currentScale;
      const contentY = (pointerY - currentViewport.y) / currentScale;
      const nextScale = getNextViewportZoomScale(currentScale, event.deltaY);

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
  };
}

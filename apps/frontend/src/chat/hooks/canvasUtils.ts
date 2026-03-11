import type { AppState } from "../../types";

export function getViewportEffectiveScale(
  viewport: AppState["viewport"],
): number {
  return viewport.zoom * viewport.scale;
}

export function snapToDevicePixel(value: number): number {
  if (typeof window === "undefined") {
    return Math.round(value);
  }

  const ratio = window.devicePixelRatio || 1;
  return Math.round(value * ratio) / ratio;
}

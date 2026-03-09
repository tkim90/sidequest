import type { AppState } from "../../types";

export function getViewportEffectiveScale(
  viewport: AppState["viewport"],
): number {
  return viewport.zoom * viewport.scale;
}

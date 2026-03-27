import type {
  AppState,
  VisualizationPhase,
  VisualizationPreviewShape,
  VisualizationRecord,
} from "../../types";

interface VisualizationFinalPayload {
  title: string;
  shapes: VisualizationPreviewShape[];
  assets: VisualizationRecord["assets"];
  bindings: VisualizationRecord["bindings"];
}

function updateVisualizationRecord(
  current: AppState,
  windowId: string,
  updater: (visualization: VisualizationRecord) => VisualizationRecord,
): AppState {
  const existingVisualization = current.visualizationsByWindowId[windowId];
  if (!existingVisualization) {
    return current;
  }

  return {
    ...current,
    visualizationsByWindowId: {
      ...current.visualizationsByWindowId,
      [windowId]: updater(existingVisualization),
    },
  };
}

export function applyVisualizationPhase(
  current: AppState,
  windowId: string,
  phase: VisualizationPhase,
  message?: string,
): AppState {
  return updateVisualizationRecord(current, windowId, (visualization) => ({
    ...visualization,
    phase,
    prompt: message ?? visualization.prompt,
  }));
}

export function applyVisualizationFinal(
  current: AppState,
  windowId: string,
  payload: VisualizationFinalPayload,
): AppState {
  return updateVisualizationRecord(current, windowId, (visualization) => ({
    ...visualization,
    status: "ready",
    phase: null,
    title: payload.title,
    shapes: payload.shapes,
    assets: payload.assets,
    bindings: payload.bindings,
    errorMessage: null,
  }));
}

export function applyVisualizationError(
  current: AppState,
  windowId: string,
  message: string,
): AppState {
  return updateVisualizationRecord(current, windowId, (visualization) => ({
    ...visualization,
    status: "error",
    phase: null,
    errorMessage: message,
  }));
}

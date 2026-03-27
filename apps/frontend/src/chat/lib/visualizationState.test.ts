import { describe, expect, it } from "vitest";

import { createInitialState, createVisualizationRecord } from "./state";
import {
  applyVisualizationError,
  applyVisualizationFinal,
  applyVisualizationPhase,
} from "./visualizationState";

describe("visualizationState", () => {
  it("transitions a visualization from loading to ready", () => {
    const initialState = createInitialState(120);
    const windowId = initialState.zOrder[0];
    const stateWithVisualization = {
      ...initialState,
      visualizationsByWindowId: {
        [windowId]: createVisualizationRecord({
          title: "Sidequest.viz1",
          prompt: "Visualizing selection",
        }),
      },
    };

    const readyState = applyVisualizationFinal(
      applyVisualizationPhase(
        stateWithVisualization,
        windowId,
        "planning",
        "Planning the diagram",
      ),
      windowId,
      {
        title: "Dijkstra final",
        shapes: [{ _type: "rectangle", shapeId: "box:1" }],
        assets: [],
        bindings: [],
      },
    );

    expect(readyState.visualizationsByWindowId[windowId]).toMatchObject({
      status: "ready",
      phase: null,
      title: "Dijkstra final",
      shapes: [{ _type: "rectangle", shapeId: "box:1" }],
      assets: [],
      bindings: [],
    });
  });

  it("marks the visualization as failed when plan generation fails", () => {
    const initialState = createInitialState(120);
    const windowId = initialState.zOrder[0];
    const stateWithVisualization = {
      ...initialState,
      visualizationsByWindowId: {
        [windowId]: createVisualizationRecord({
          title: "Sidequest.viz1",
          prompt: "Visualizing selection",
        }),
      },
    };

    const errorState = applyVisualizationError(
      stateWithVisualization,
      windowId,
      "The plan failed.",
    );

    expect(errorState.visualizationsByWindowId[windowId]).toMatchObject({
      status: "error",
      phase: null,
      errorMessage: "The plan failed.",
    });
  });
});

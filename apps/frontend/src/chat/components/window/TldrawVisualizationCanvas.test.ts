import { describe, expect, it, vi } from "vitest";

import type { VisualizationRecord } from "../../../types";
import { initializeVisualizationEditor } from "./TldrawVisualizationCanvas";

const VISUALIZATION: Pick<
  VisualizationRecord,
  | "bindings"
  | "shapes"
  | "status"
> = {
  status: "ready",
  shapes: [{ _type: "rectangle", shapeId: "box:1" }],
  bindings: [],
};

describe("initializeVisualizationEditor", () => {
  it("loads the visualization before switching the editor to readonly", () => {
    const callOrder: string[] = [];
    const editor = {
      updateInstanceState: vi.fn(() => {
        callOrder.push("readonly");
      }),
    } as const;
    const applyVisualizationShapes = vi.fn(() => {
      callOrder.push("apply");
    });
    const zoomToVisualization = vi.fn(() => {
      callOrder.push("zoom");
    });

    initializeVisualizationEditor(
      editor as never,
      VISUALIZATION,
      {
        applyVisualizationShapes,
        zoomToVisualization,
      },
    );

    expect(applyVisualizationShapes).toHaveBeenCalledWith(
      editor,
      {
        shapes: [{ _type: "rectangle", shapeId: "box:1" }],
        bindings: [],
      },
    );
    expect(zoomToVisualization).toHaveBeenCalledWith(editor, [
      {
        id: "shape:box:1",
        parentId: null,
        type: "rectangle",
      },
    ]);
    expect(editor.updateInstanceState).toHaveBeenCalledWith({
      isReadonly: true,
    });
    expect(callOrder).toEqual(["apply", "zoom", "readonly"]);
  });
});

import "tldraw/tldraw.css";

import type { Editor } from "tldraw";
import { Tldraw } from "tldraw";

import type { VisualizationRecord } from "../../../types";
import {
  applyVisualizationShapes,
  getVisualizationShapeDescriptors,
  zoomToVisualization,
} from "../../lib/tldrawSnapshot";

interface TldrawVisualizationCanvasProps {
  visualization: Pick<
    VisualizationRecord,
    | "bindings"
    | "shapes"
    | "status"
  >;
}

interface VisualizationEditorSetupDependencies {
  applyVisualizationShapes: typeof applyVisualizationShapes;
  zoomToVisualization: typeof zoomToVisualization;
}

const DEFAULT_VISUALIZATION_EDITOR_SETUP: VisualizationEditorSetupDependencies = {
  applyVisualizationShapes,
  zoomToVisualization,
};

export function initializeVisualizationEditor(
  editor: Editor,
  visualization: TldrawVisualizationCanvasProps["visualization"],
  dependencies: VisualizationEditorSetupDependencies = DEFAULT_VISUALIZATION_EDITOR_SETUP,
): void {
  dependencies.applyVisualizationShapes(editor, {
    shapes: visualization.shapes,
    bindings: visualization.bindings,
  });
  dependencies.zoomToVisualization(
    editor,
    getVisualizationShapeDescriptors({
      shapes: visualization.shapes,
      bindings: visualization.bindings,
    }),
  );

  editor.updateInstanceState({
    isReadonly: true,
  });
}

function TldrawVisualizationCanvas({
  visualization,
}: TldrawVisualizationCanvasProps) {
  const canvasKey =
    `${visualization.status}:${JSON.stringify(visualization.shapes)}:${JSON.stringify(visualization.bindings)}`;

  return (
    <div className="h-full min-h-0 min-w-0" data-visualization-canvas="true">
      <Tldraw
        hideUi
        key={canvasKey}
        onMount={(editor) => {
          initializeVisualizationEditor(editor, visualization);
        }}
      />
    </div>
  );
}

export default TldrawVisualizationCanvas;

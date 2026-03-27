import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { VisualizationRecord, WindowRecord } from "../../../types";
import VisualizationWindow from "./VisualizationWindow";

vi.mock("./TldrawVisualizationCanvas", () => ({
  default: () => <div data-preview-canvas="true" />,
}));

const WINDOW: WindowRecord = {
  id: "window-1",
  kind: "visualization",
  title: "Sidequest.viz1",
  x: 120,
  y: 64,
  width: 520,
  height: 460,
  parentId: "root",
  childIds: [],
  branchAnchorId: null,
  branchFocus: null,
  inheritedMessageCount: 0,
  isHistoryExpanded: false,
  composer: "",
  selectedModel: null,
  selectedEffort: null,
  isStreaming: false,
};

const VISUALIZATION: VisualizationRecord = {
  status: "ready",
  phase: null,
  title: "Preview",
  prompt: "Rendering preview",
  shapes: [{ _type: "rectangle", shapeId: "box:1" }],
  assets: [],
  bindings: [],
  errorMessage: null,
};

const noop = () => {};

describe("VisualizationWindow", () => {
  it("renders the visualization canvas once the payload is ready", () => {
    const markup = renderToStaticMarkup(
      <VisualizationWindow
        isFocused
        onClose={noop}
        onHeaderPointerDown={noop}
        onNavigateToBranchSource={noop}
        onResizePointerDown={noop}
        onWindowFocus={noop}
        registerWindowRef={noop}
        visualization={VISUALIZATION}
        windowData={WINDOW}
        zIndex={1}
      />,
    );

    expect(markup).toContain('data-preview-canvas="true"');
    expect(markup).toContain('data-visualization-window="true"');
  });
});

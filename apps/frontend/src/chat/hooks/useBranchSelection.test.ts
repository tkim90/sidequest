import { describe, expect, it } from "vitest";

import {
  FLOATING_ROOT_WINDOW_HEIGHT,
  FLOATING_ROOT_WINDOW_WIDTH,
  VISUALIZATION_WINDOW_HEIGHT,
  VISUALIZATION_WINDOW_WIDTH,
} from "../lib/constants";
import { createMessage, createVisualizationRecord, createWindowRecord } from "../lib/state";
import { createBranchWindow, createVisualizationWindow } from "./useBranchSelection";

describe("createBranchWindow", () => {
  it("inherits the parent model and effort", () => {
    const parentWindow = createWindowRecord({
      title: "Chat 1",
      x: 120,
      y: 80,
      selectedModel: "gpt-5.1",
      selectedEffort: "high",
    });
    const anchorMessage = createMessage("assistant", "Parent answer");

    const childWindow = createBranchWindow({
      childIndex: 0,
      parentWidth: parentWindow.width,
      inheritedMessageCount: 2,
      parentWindow,
      selectedText: "answer",
      windowLocalY: 160,
      anchorMessage,
    });

    expect(childWindow.selectedModel).toBe("gpt-5.1");
    expect(childWindow.selectedEffort).toBe("high");
    expect(childWindow.branchFocus).toEqual({
      selectedText: "answer",
      parentWindowTitle: "Chat 1",
      parentMessageRole: "assistant",
    });
    expect(childWindow.width).toBe(FLOATING_ROOT_WINDOW_WIDTH);
    expect(childWindow.height).toBe(FLOATING_ROOT_WINDOW_HEIGHT);
  });

  it("uses an explicit canvas x position when provided", () => {
    const parentWindow = createWindowRecord({
      title: "Chat 1",
      x: 480,
      y: 80,
    });
    const anchorMessage = createMessage("assistant", "Parent answer");

    const childWindow = createBranchWindow({
      childX: 56,
      childIndex: 0,
      parentWidth: parentWindow.width,
      inheritedMessageCount: 2,
      parentWindow,
      selectedText: "answer",
      windowLocalY: 160,
      anchorMessage,
    });

    expect(childWindow.x).toBe(56);
  });
});

describe("createVisualizationWindow", () => {
  it("creates a visualization child that inherits the parent model and effort", () => {
    const parentWindow = createWindowRecord({
      title: "Chat 3",
      x: 160,
      y: 120,
      selectedModel: "gpt-5.4",
      selectedEffort: "medium",
    });
    const anchorMessage = createMessage("assistant", "System overview");

    const childWindow = createVisualizationWindow({
      parentWidth: parentWindow.width,
      parentWindow,
      selectedText: "System overview",
      visualizationIndex: 1,
      windowLocalY: 180,
      anchorMessage,
    });

    expect(childWindow.kind).toBe("visualization");
    expect(childWindow.title).toBe("Chat 3.viz2");
    expect(childWindow.selectedModel).toBe("gpt-5.4");
    expect(childWindow.selectedEffort).toBe("medium");
    expect(childWindow.width).toBe(VISUALIZATION_WINDOW_WIDTH);
    expect(childWindow.height).toBe(VISUALIZATION_WINDOW_HEIGHT);
    expect(childWindow.branchFocus).toEqual({
      selectedText: "System overview",
      parentWindowTitle: "Chat 3",
      parentMessageRole: "assistant",
    });
  });
});

describe("createVisualizationRecord prompt storage", () => {
  it("stores the visualize query when provided", () => {
    expect(
      createVisualizationRecord({
        title: "Chat 3.viz2",
        prompt: "Show the request flow",
      }).prompt,
    ).toBe("Show the request flow");
  });

  it("can fall back to the selected text when no visualize query is provided", () => {
    expect(
      createVisualizationRecord({
        title: "Chat 3.viz2",
        prompt: "System overview",
      }).prompt,
    ).toBe("System overview");
  });
});

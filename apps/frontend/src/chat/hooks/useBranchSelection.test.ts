import { describe, expect, it } from "vitest";

import {
  CHILD_WINDOW_HEIGHT,
  CHILD_WINDOW_WIDTH,
} from "../lib/constants";
import { createMessage, createWindowRecord } from "../lib/state";
import { createBranchWindow } from "./useBranchSelection";

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
    expect(childWindow.width).toBe(CHILD_WINDOW_WIDTH);
    expect(childWindow.height).toBe(CHILD_WINDOW_HEIGHT);
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

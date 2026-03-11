import { describe, expect, it } from "vitest";

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
  });
});

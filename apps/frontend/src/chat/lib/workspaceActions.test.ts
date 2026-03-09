import { describe, expect, it } from "vitest";

import { createAnchorRecord, createInitialState, createMessage, createWindowRecord } from "./state";
import {
  appendAssistantDelta,
  buildCloseAllChildrenPrompt,
  completeAssistantMessage,
  queueOutgoingMessages,
  removeWindowsFromState,
} from "./workspaceActions";

describe("workspaceActions", () => {
  it("updates the assistant stream lifecycle without mutating other windows", () => {
    const initialState = createInitialState(120);
    const rootWindowId = initialState.zOrder[0];
    const userMessage = createMessage("user", "Hello");
    const assistantMessage = createMessage("assistant", "", "streaming");

    const queuedState = queueOutgoingMessages(
      initialState,
      rootWindowId,
      userMessage,
      assistantMessage,
    );
    const deltaState = appendAssistantDelta(
      queuedState,
      rootWindowId,
      assistantMessage.id,
      "world",
    );
    const completeState = completeAssistantMessage(
      deltaState,
      rootWindowId,
      assistantMessage.id,
    );

    expect(queuedState.windows[rootWindowId]?.isStreaming).toBe(true);
    expect(deltaState.messagesByWindowId[rootWindowId]?.[1]?.content).toBe("world");
    expect(completeState.messagesByWindowId[rootWindowId]?.[1]?.status).toBe(
      "complete",
    );
    expect(completeState.windows[rootWindowId]?.isStreaming).toBe(false);
  });

  it("removes child windows and their anchors from state", () => {
    const initialState = createInitialState(120);
    const rootWindowId = initialState.zOrder[0];
    const childWindow = createWindowRecord({
      title: "Chat 1.1",
      x: 400,
      y: 80,
      parentId: rootWindowId,
    });
    const rootMessage = createMessage("assistant", "Parent");
    const anchor = createAnchorRecord({
      parentWindowId: rootWindowId,
      parentMessageId: rootMessage.id,
      childWindowId: childWindow.id,
      selectedText: "Parent",
      startOffset: 0,
      endOffset: 6,
    });

    const stateWithChild = {
      ...initialState,
      windows: {
        ...initialState.windows,
        [rootWindowId]: {
          ...initialState.windows[rootWindowId],
          childIds: [childWindow.id],
        },
        [childWindow.id]: {
          ...childWindow,
          branchAnchorId: anchor.id,
        },
      },
      zOrder: [...initialState.zOrder, childWindow.id],
      messagesByWindowId: {
        ...initialState.messagesByWindowId,
        [rootWindowId]: [rootMessage],
        [childWindow.id]: [],
      },
      anchors: {
        [anchor.id]: anchor,
      },
    };

    const nextState = removeWindowsFromState(stateWithChild, [childWindow.id]);

    expect(nextState.windows[childWindow.id]).toBeUndefined();
    expect(nextState.anchors[anchor.id]).toBeUndefined();
    expect(nextState.windows[rootWindowId]?.childIds).toEqual([]);
  });

  it("builds a close-all prompt only when child windows exist", () => {
    const initialState = createInitialState(120);
    expect(buildCloseAllChildrenPrompt(initialState.windows)).toBeNull();

    const rootWindowId = initialState.zOrder[0];
    const childWindow = createWindowRecord({
      title: "Chat 1.1",
      x: 400,
      y: 80,
      parentId: rootWindowId,
    });

    const prompt = buildCloseAllChildrenPrompt({
      ...initialState.windows,
      [childWindow.id]: childWindow,
    });

    expect(prompt).toEqual({
      confirmLabel: "Close child windows",
      eyebrow: "Close child windows",
      title: "This will close every branched chat window and keep the main thread open.",
      windowIds: [childWindow.id],
      windowTitles: ["Chat 1.1"],
    });
  });
});

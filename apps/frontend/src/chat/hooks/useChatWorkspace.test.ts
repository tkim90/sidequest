import { describe, expect, it } from "vitest";

import type { AnchorGroupsByMessageKey, SelectionState } from "../../types";
import {
  createAnchorRecord,
  createInitialState,
  createMessage,
  createWindowRecord,
} from "../lib/state";
import { mergeSelectionPreviewAnchorGroup, resolveBranchSourceNavigation } from "./useChatWorkspace";

describe("mergeSelectionPreviewAnchorGroup", () => {
  const baseGroups: AnchorGroupsByMessageKey = {
    "window-1:message-1": [
      {
        key: "anchor-1",
        startOffset: 10,
        endOffset: 20,
        anchorIds: ["anchor-1"],
      },
    ],
  };

  const selectionState: SelectionState = {
    parentWindowId: "window-1",
    parentMessageId: "message-1",
    selectedText: "selected text",
    stage: "compose",
    startOffset: 2,
    endOffset: 8,
    x: 100,
    y: 200,
    windowLocalY: 120,
  };

  it("does not inject the preview highlight while the CTA is showing", () => {
    const result = mergeSelectionPreviewAnchorGroup(baseGroups, {
      ...selectionState,
      stage: "cta",
    });

    expect(result).toBe(baseGroups);
  });

  it("injects the preview highlight once the composer is expanded", () => {
    const result = mergeSelectionPreviewAnchorGroup(baseGroups, selectionState);

    expect(result).not.toBe(baseGroups);
    expect(result["window-1:message-1"]).toEqual([
      {
        key: "__preview__",
        startOffset: 2,
        endOffset: 8,
        anchorIds: [],
        preview: true,
      },
      {
        key: "anchor-1",
        startOffset: 10,
        endOffset: 20,
        anchorIds: ["anchor-1"],
      },
    ]);
  });
});

describe("resolveBranchSourceNavigation", () => {
  it("resolves the source pane and anchor group for a branch", () => {
    const initialState = createInitialState(120);
    const rootWindowId = initialState.zOrder[0];
    const rootMessage = createMessage("assistant", "Parent answer");
    const childWindow = createWindowRecord({
      title: "Chat 1.1",
      x: 420,
      y: 120,
      parentId: rootWindowId,
    });
    const anchor = createAnchorRecord({
      parentWindowId: rootWindowId,
      parentMessageId: rootMessage.id,
      childWindowId: childWindow.id,
      selectedText: "answer",
      startOffset: 7,
      endOffset: 13,
    });

    const appState = {
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

    expect(resolveBranchSourceNavigation(appState, childWindow.id, anchor.id)).toEqual({
      shouldBringSourceToFront: false,
      shouldExpandSourceHistory: false,
      sourceGroupKey: anchor.groupKey,
      sourceWindowId: rootWindowId,
    });
  });

  it("expands collapsed inherited history when the source message is hidden", () => {
    const initialState = createInitialState(120);
    const rootWindowId = initialState.zOrder[0];
    const parentWindow = createWindowRecord({
      title: "Chat 1.1",
      x: 420,
      y: 120,
      parentId: rootWindowId,
      inheritedMessageCount: 1,
      isHistoryExpanded: false,
    });
    const branchWindow = createWindowRecord({
      title: "Chat 1.1.1",
      x: 760,
      y: 180,
      parentId: parentWindow.id,
    });
    const inheritedMessage = createMessage("assistant", "Inherited");
    const liveMessage = createMessage("user", "Visible");
    const anchor = createAnchorRecord({
      parentWindowId: parentWindow.id,
      parentMessageId: inheritedMessage.id,
      childWindowId: branchWindow.id,
      selectedText: "Inherited",
      startOffset: 0,
      endOffset: 9,
    });

    const appState = {
      ...initialState,
      windows: {
        ...initialState.windows,
        [rootWindowId]: {
          ...initialState.windows[rootWindowId],
          childIds: [parentWindow.id],
        },
        [parentWindow.id]: {
          ...parentWindow,
          childIds: [branchWindow.id],
        },
        [branchWindow.id]: {
          ...branchWindow,
          branchAnchorId: anchor.id,
        },
      },
      zOrder: [...initialState.zOrder, parentWindow.id, branchWindow.id],
      messagesByWindowId: {
        ...initialState.messagesByWindowId,
        [rootWindowId]: [],
        [parentWindow.id]: [inheritedMessage, liveMessage],
        [branchWindow.id]: [],
      },
      anchors: {
        [anchor.id]: anchor,
      },
    };

    expect(resolveBranchSourceNavigation(appState, branchWindow.id, anchor.id)).toEqual({
      shouldBringSourceToFront: true,
      shouldExpandSourceHistory: true,
      sourceGroupKey: anchor.groupKey,
      sourceWindowId: parentWindow.id,
    });
  });

  it("does nothing when the immediate parent pane is gone", () => {
    const initialState = createInitialState(120);
    const rootWindowId = initialState.zOrder[0];
    const missingParentWindow = createWindowRecord({
      title: "Chat 1.1",
      x: 420,
      y: 120,
      parentId: rootWindowId,
    });
    const branchWindow = createWindowRecord({
      title: "Chat 1.1.1",
      x: 760,
      y: 180,
      parentId: missingParentWindow.id,
    });
    const anchor = createAnchorRecord({
      parentWindowId: missingParentWindow.id,
      parentMessageId: "message-1",
      childWindowId: branchWindow.id,
      selectedText: "Parent",
      startOffset: 0,
      endOffset: 6,
    });

    const appState = {
      ...initialState,
      windows: {
        ...initialState.windows,
        [branchWindow.id]: {
          ...branchWindow,
          branchAnchorId: anchor.id,
        },
      },
      zOrder: [...initialState.zOrder, branchWindow.id],
      messagesByWindowId: {
        ...initialState.messagesByWindowId,
        [branchWindow.id]: [],
      },
      anchors: {
        [anchor.id]: anchor,
      },
    };

    expect(resolveBranchSourceNavigation(appState, branchWindow.id, anchor.id)).toBeNull();
  });
});

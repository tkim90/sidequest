import { describe, expect, it } from "vitest";

import type { AnchorGroupsByMessageKey, SelectionState } from "../../types";
import { mergeSelectionPreviewAnchorGroup } from "./useChatWorkspace";

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

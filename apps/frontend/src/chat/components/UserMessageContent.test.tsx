import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AnchorGroup } from "../../types";
import UserMessageContent from "./UserMessageContent";

describe("UserMessageContent", () => {
  it("renders active source anchors with the stronger highlight", () => {
    const anchorGroups: AnchorGroup[] = [
      {
        key: "anchor-1",
        startOffset: 6,
        endOffset: 11,
        anchorIds: ["anchor-1"],
        activeSource: true,
      },
    ];

    const markup = renderToStaticMarkup(
      <UserMessageContent
        anchorGroups={anchorGroups}
        isFocused
        message={{
          id: "message-1",
          role: "user",
          content: "Hello world",
          status: "complete",
          reasoningRawContent: "",
          reasoningSummaryContent: "",
        }}
        onMessageMouseDown={() => {}}
        registerAnchorRef={() => {}}
        windowId="window-1"
      />,
    );

    expect(markup).toContain('border-warning/70 bg-warning/30');
    expect(markup).not.toContain('bg-warning/20');
  });
});

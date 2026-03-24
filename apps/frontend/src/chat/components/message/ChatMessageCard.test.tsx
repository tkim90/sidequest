import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { MessageRecord } from "../../../types";
import ChatMessageCard, { getReasoningDisclosureData } from "./ChatMessageCard";

function createMessage(overrides: Partial<MessageRecord> = {}): MessageRecord {
  return {
    id: "message-1",
    role: "assistant",
    content: "Answer",
    status: "complete",
    reasoningRawContent: "",
    reasoningSummaryContent: "",
    ...overrides,
  };
}

describe("getReasoningDisclosureData", () => {
  it("prefers raw reasoning content", () => {
    const result = getReasoningDisclosureData(
      createMessage({
        reasoningRawContent: "raw reasoning",
        reasoningSummaryContent: "summary reasoning",
      }),
    );

    expect(result.displayedReasoning).toBe("raw reasoning");
    expect(result.reasoningMessage?.id).toBe("message-1:reasoning");
    expect(result.reasoningMessage?.content).toBe("raw reasoning");
  });

  it("falls back to summary reasoning content", () => {
    const result = getReasoningDisclosureData(
      createMessage({
        reasoningSummaryContent: "summary reasoning",
      }),
    );

    expect(result.displayedReasoning).toBe("summary reasoning");
    expect(result.reasoningMessage?.content).toBe("summary reasoning");
  });

  it("returns no disclosure data when reasoning is absent", () => {
    const result = getReasoningDisclosureData(createMessage());

    expect(result.displayedReasoning).toBeNull();
    expect(result.reasoningMessage).toBeNull();
  });
});

describe("ChatMessageCard", () => {
  it("renders an assistant message with model badge and retry button", () => {
    const markup = renderToStaticMarkup(
      <ChatMessageCard
        anchorGroups={[]}
        isFocused
        isFixedPane={false}
        message={createMessage({ model: "gpt-4o" })}
        onMessageMouseDown={() => {}}
        onRetry={() => {}}
        registerAnchorRef={() => {}}
        windowId="window-1"
      />,
    );

    expect(markup).toContain('title="Retry"');
    expect(markup).toContain(">gpt-4o</span>");
    expect(markup).toContain("data-message-card");
    expect(markup).toContain("self-start w-full");
  });

  it("renders a user message without footer controls", () => {
    const markup = renderToStaticMarkup(
      <ChatMessageCard
        anchorGroups={[]}
        isFocused
        isFixedPane={false}
        message={createMessage({ role: "user", content: "Hello" })}
        onMessageMouseDown={() => {}}
        onRetry={() => {}}
        registerAnchorRef={() => {}}
        windowId="window-1"
      />,
    );

    expect(markup).toContain("data-message-card");
    expect(markup).toContain("px-4 py-2");
    expect(markup).not.toContain('title="Retry"');
  });

  it("renders a reasoning disclosure when reasoning content exists", () => {
    const markup = renderToStaticMarkup(
      <ChatMessageCard
        anchorGroups={[]}
        isFocused
        isFixedPane={false}
        message={createMessage({ reasoningRawContent: "deep thoughts" })}
        onMessageMouseDown={() => {}}
        onRetry={() => {}}
        registerAnchorRef={() => {}}
        windowId="window-1"
      />,
    );

    expect(markup).toContain(">Reasoning<");
    expect(markup).toContain('aria-expanded="false"');
  });

  it("does not render a reasoning disclosure when reasoning is absent", () => {
    const markup = renderToStaticMarkup(
      <ChatMessageCard
        anchorGroups={[]}
        isFocused
        isFixedPane={false}
        message={createMessage()}
        onMessageMouseDown={() => {}}
        onRetry={() => {}}
        registerAnchorRef={() => {}}
        windowId="window-1"
      />,
    );

    expect(markup).not.toContain(">Reasoning<");
  });

  it("applies fixed-pane styling when isFixedPane is true", () => {
    const markup = renderToStaticMarkup(
      <ChatMessageCard
        anchorGroups={[]}
        isFocused
        isFixedPane
        message={createMessage()}
        onMessageMouseDown={() => {}}
        onRetry={() => {}}
        registerAnchorRef={() => {}}
        windowId="window-1"
      />,
    );

    expect(markup).toContain("w-full min-w-0 font-normal text-foreground");
  });
});

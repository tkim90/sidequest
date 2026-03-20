import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { MessageRecord } from "../../types";
import { getDisclosureContentShellStyle } from "./CollapsibleDisclosure";
import ChatWindowMessages, {
  getReasoningDisclosureData,
} from "./ChatWindowMessages";

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

function renderMessages(messages: MessageRecord[]): string {
  return renderToStaticMarkup(
    <ChatWindowMessages
      anchorGroupsByMessageKey={{}}
      historyPreviewCount={0}
      isFocused
      isHistoryExpanded
      messages={messages}
      onMessageMouseDown={() => {}}
      onStarterQuestionClick={() => {}}
      onRetry={() => {}}
      onScroll={() => {}}
      onToggleHistoryExpanded={() => {}}
      registerAnchorRef={() => {}}
      scrollRef={{ current: null }}
      windowId="window-1"
    />,
  );
}

describe("getDisclosureContentShellStyle", () => {
  it("returns an expanded shell style with height and opacity", () => {
    expect(getDisclosureContentShellStyle(true, 240)).toMatchObject({
      height: 240,
      marginTop: 16,
      opacity: 1,
      overflow: "hidden",
      pointerEvents: "auto",
      transitionDuration: "260ms",
      transitionProperty: "height, opacity, margin-top",
    });
  });

  it("returns a collapsed shell style that hides content but keeps it mounted", () => {
    expect(getDisclosureContentShellStyle(false, 240)).toMatchObject({
      height: 0,
      marginTop: 0,
      opacity: 0,
      overflow: "hidden",
      pointerEvents: "none",
      transitionDuration: "260ms",
      transitionProperty: "height, opacity, margin-top",
    });
  });
});

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

describe("ChatWindowMessages reasoning disclosure", () => {
  it("renders the shared disclosure label for assistant reasoning", () => {
    const markup = renderMessages([
      createMessage({
        reasoningRawContent: "raw reasoning",
      }),
    ]);

    expect(markup).toContain(">Reasoning<");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain(
      'flex w-full cursor-pointer items-center justify-between gap-3 text-left text-sm font-semibold uppercase text-muted-foreground transition-colors hover:text-foreground',
    );
  });

  it("does not render a reasoning disclosure when both reasoning fields are empty", () => {
    const markup = renderMessages([createMessage()]);

    expect(markup).not.toContain(">Reasoning<");
  });
});

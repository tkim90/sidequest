import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MessageRecord } from "../../../types";
import { getDisclosureContentShellStyle } from "../message/CollapsibleDisclosure";
import ChatWindowMessages, {
  SCROLLBAR_INACTIVITY_DELAY_MS,
  createScrollbarVisibilityController,
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

function renderMessages(
  messages: MessageRecord[],
  options: { mobileInteractionMode?: "scroll" | "scroll-first-swipe" } = {},
): string {
  return renderToStaticMarkup(
    <ChatWindowMessages
      anchorGroupsByMessageKey={{}}
      historyPreviewCount={0}
      isFocused
      isHistoryExpanded
      messages={messages}
      mobileInteractionMode={options.mobileInteractionMode}
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

afterEach(() => {
  vi.useRealTimers();
});

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

  it("marks the scroll body as a swipe surface only in scroll-first-swipe mode", () => {
    const swipeMarkup = renderMessages([], {
      mobileInteractionMode: "scroll-first-swipe",
    });
    const scrollMarkup = renderMessages([], {
      mobileInteractionMode: "scroll",
    });
    const defaultMarkup = renderMessages([]);

    expect(swipeMarkup).toContain('data-mobile-drag-surface="true"');
    expect(swipeMarkup).toContain('data-mobile-scroll-surface="true"');
    expect(swipeMarkup).toContain('style="touch-action:pan-y"');
    expect(scrollMarkup).not.toContain('data-mobile-drag-surface=');
    expect(scrollMarkup).toContain('data-mobile-scroll-surface="true"');
    expect(scrollMarkup).toContain('style="touch-action:pan-y"');
    expect(defaultMarkup).not.toContain('data-mobile-drag-surface=');
    expect(defaultMarkup).not.toContain('data-mobile-scroll-surface=');
  });
});

describe("createScrollbarVisibilityController", () => {
  it("reveals on activity and hides after the inactivity timeout", () => {
    vi.useFakeTimers();

    let isVisible = false;
    const hoverRef = { current: false };
    const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null };
    const controller = createScrollbarVisibilityController({
      isHoveringRef: hoverRef,
      setVisible: (nextVisible) => {
        isVisible = nextVisible;
      },
      timeoutRef,
    });

    controller.revealFromActivity();

    expect(isVisible).toBe(true);
    vi.advanceTimersByTime(SCROLLBAR_INACTIVITY_DELAY_MS - 1);
    expect(isVisible).toBe(true);
    vi.advanceTimersByTime(1);
    expect(isVisible).toBe(false);
  });

  it("resets the hide timer when activity happens again before timeout", () => {
    vi.useFakeTimers();

    let isVisible = false;
    const hoverRef = { current: false };
    const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null };
    const controller = createScrollbarVisibilityController({
      isHoveringRef: hoverRef,
      setVisible: (nextVisible) => {
        isVisible = nextVisible;
      },
      timeoutRef,
    });

    controller.revealFromActivity();
    vi.advanceTimersByTime(1200);
    controller.revealFromActivity();

    vi.advanceTimersByTime(1200);
    expect(isVisible).toBe(true);
    vi.advanceTimersByTime(800);
    expect(isVisible).toBe(false);
  });

  it("keeps the scrollbar visible while hovered and starts hiding after mouse leave", () => {
    vi.useFakeTimers();

    let isVisible = false;
    const hoverRef = { current: false };
    const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null };
    const controller = createScrollbarVisibilityController({
      isHoveringRef: hoverRef,
      setVisible: (nextVisible) => {
        isVisible = nextVisible;
      },
      timeoutRef,
    });

    controller.handleMouseEnter();

    expect(isVisible).toBe(true);
    vi.advanceTimersByTime(SCROLLBAR_INACTIVITY_DELAY_MS * 2);
    expect(isVisible).toBe(true);

    controller.handleMouseLeave();
    vi.advanceTimersByTime(SCROLLBAR_INACTIVITY_DELAY_MS - 1);
    expect(isVisible).toBe(true);
    vi.advanceTimersByTime(1);
    expect(isVisible).toBe(false);
  });
});

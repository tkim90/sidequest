import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChatWindowComposer from "./ChatWindowComposer";

function createProps(overrides: Partial<React.ComponentProps<typeof ChatWindowComposer>> = {}) {
  return {
    composer: "",
    isChildPane: false,
    isStreaming: false,
    isFixedPane: false,
    onComposerChange: () => {},
    onModelChange: () => {},
    onEffortChange: () => {},
    onSend: () => {},
    selectedModel: null,
    selectedEffort: null,
    textareaRef: { current: null },
    title: "Chat 1",
    ...overrides,
  };
}

describe("ChatWindowComposer", () => {
  it("uses the main-pane placeholder for the fixed pane", () => {
    const markup = renderToStaticMarkup(
      <ChatWindowComposer {...createProps({ isFixedPane: true })} />,
    );

    expect(markup).toContain('placeholder="Write something..."');
  });

  it("keeps the follow-up placeholder for child panes", () => {
    const markup = renderToStaticMarkup(
      <ChatWindowComposer {...createProps({ isChildPane: true })} />,
    );

    expect(markup).toContain('placeholder="Ask a follow-up..."');
    expect(markup).toContain('w-full min-w-0 rounded-2xl');
    expect(markup).toContain('flex w-full min-w-0 items-end gap-2');
  });

  it("hides the send button when the composer is empty", () => {
    const markup = renderToStaticMarkup(
      <ChatWindowComposer {...createProps({ composer: "" })} />,
    );

    expect(markup).not.toContain('aria-label="Send message"');
  });

  it("hides the send button when the composer has only whitespace", () => {
    const markup = renderToStaticMarkup(
      <ChatWindowComposer {...createProps({ composer: "   \n  " })} />,
    );

    expect(markup).not.toContain('aria-label="Send message"');
  });

  it("shows the send button when the composer has non-whitespace content", () => {
    const markup = renderToStaticMarkup(
      <ChatWindowComposer {...createProps({ composer: "hello" })} />,
    );

    expect(markup).toContain('aria-label="Send message"');
  });

  it("hides the send button while streaming even with content", () => {
    const markup = renderToStaticMarkup(
      <ChatWindowComposer {...createProps({ composer: "hello", isStreaming: true })} />,
    );

    expect(markup).not.toContain('aria-label="Send message"');
  });

  it("renders the send button using the Button primitive data-slot", () => {
    const markup = renderToStaticMarkup(
      <ChatWindowComposer {...createProps({ composer: "hello" })} />,
    );

    expect(markup).toContain('data-slot="button"');
  });
});

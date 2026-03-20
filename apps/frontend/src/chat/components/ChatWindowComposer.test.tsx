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
});

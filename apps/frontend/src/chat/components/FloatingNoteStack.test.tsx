import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AnchorGroupsByMessageKey, WindowRecord } from "../../types";
import type { FloatingWindowPresenceEntry } from "../hooks/useFloatingWindowPresence";
import FloatingNoteStack from "./FloatingNoteStack";

const noop = () => {};

function makeWindow(overrides: Partial<WindowRecord> = {}): WindowRecord {
  return {
    id: "w1",
    title: "Chat 1",
    x: 100,
    y: 50,
    width: 520,
    height: 460,
    parentId: null,
    childIds: [],
    branchAnchorId: null,
    branchFocus: null,
    inheritedMessageCount: 0,
    isHistoryExpanded: false,
    composer: "",
    selectedModel: null,
    selectedEffort: null,
    isStreaming: false,
    ...overrides,
  };
}

function makeEntry(
  overrides: Partial<FloatingWindowPresenceEntry> = {},
): FloatingWindowPresenceEntry {
  return {
    enterKind: "newNote",
    isExiting: false,
    messages: [],
    savedScrollState: { scrollTop: null, shouldAutoScroll: true },
    windowData: makeWindow(),
    zIndex: 1,
    ...overrides,
  };
}

describe("FloatingNoteStack", () => {
  it("renders nothing when entries is empty", () => {
    const markup = renderToStaticMarkup(
      <FloatingNoteStack
        anchorGroupsByMessageKey={{} as AnchorGroupsByMessageKey}
        entries={[]}
        liveWindowCount={0}
        onClose={noop}
        onComposerChange={noop}
        onEffortChange={noop}
        onGeometryChange={noop}
        onHeaderPointerDown={noop}
        onMessageMouseDown={noop}
        onModelChange={noop}
        onNavigateToBranchSource={noop}
        onResizePointerDown={noop}
        onRetry={noop}
        onSend={noop}
        onToggleHistoryExpanded={noop}
        onWindowFocus={noop}
        onWindowScrollStateChange={noop}
        registerAnchorRef={noop}
        registerWindowRef={noop}
      />,
    );

    expect(markup).toBe("");
  });

  it("renders a floating ChatWindow with resize handles and close button", () => {
    const markup = renderToStaticMarkup(
      <FloatingNoteStack
        anchorGroupsByMessageKey={{} as AnchorGroupsByMessageKey}
        entries={[makeEntry()]}
        liveWindowCount={1}
        onClose={noop}
        onComposerChange={noop}
        onEffortChange={noop}
        onGeometryChange={noop}
        onHeaderPointerDown={noop}
        onMessageMouseDown={noop}
        onModelChange={noop}
        onNavigateToBranchSource={noop}
        onResizePointerDown={noop}
        onRetry={noop}
        onSend={noop}
        onToggleHistoryExpanded={noop}
        onWindowFocus={noop}
        onWindowScrollStateChange={noop}
        registerAnchorRef={noop}
        registerWindowRef={noop}
      />,
    );

    expect(markup).toContain("data-chat-window");
    expect(markup).toContain("data-resize-handle");
    expect(markup).toContain('aria-label="Close note"');
    expect(markup).toContain("paper-texture-window");
  });

  it("renders multiple floating windows", () => {
    const entries = [
      makeEntry({ windowData: makeWindow({ id: "w1", title: "Chat 1" }), zIndex: 1 }),
      makeEntry({ windowData: makeWindow({ id: "w2", title: "Chat 2" }), zIndex: 2 }),
    ];

    const markup = renderToStaticMarkup(
      <FloatingNoteStack
        anchorGroupsByMessageKey={{} as AnchorGroupsByMessageKey}
        entries={entries}
        liveWindowCount={2}
        onClose={noop}
        onComposerChange={noop}
        onEffortChange={noop}
        onGeometryChange={noop}
        onHeaderPointerDown={noop}
        onMessageMouseDown={noop}
        onModelChange={noop}
        onNavigateToBranchSource={noop}
        onResizePointerDown={noop}
        onRetry={noop}
        onSend={noop}
        onToggleHistoryExpanded={noop}
        onWindowFocus={noop}
        onWindowScrollStateChange={noop}
        registerAnchorRef={noop}
        registerWindowRef={noop}
      />,
    );

    const windowCount = (markup.match(/data-chat-window/g) ?? []).length;
    expect(windowCount).toBe(2);
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type {
  AnchorGroupsByMessageKey,
  MessagesByWindowId,
  Viewport,
  WindowRecord,
  WindowScrollState,
} from "../../types";
import ChatCanvas from "./ChatCanvas";

const VIEWPORT: Viewport = {
  x: 0,
  y: 0,
  scale: 1,
  zoom: 1,
};

const ROOT_WINDOW: WindowRecord = {
  id: "root",
  title: "Sidequest",
  x: 0,
  y: 0,
  width: 720,
  height: 800,
  parentId: null,
  childIds: ["child"],
  branchAnchorId: null,
  branchFocus: null,
  inheritedMessageCount: 0,
  isHistoryExpanded: false,
  composer: "",
  selectedModel: null,
  selectedEffort: null,
  isStreaming: false,
};

const CHILD_WINDOW: WindowRecord = {
  id: "child",
  title: "Chat 1.1",
  x: 120,
  y: 64,
  width: 520,
  height: 460,
  parentId: "root",
  childIds: [],
  branchAnchorId: null,
  branchFocus: null,
  inheritedMessageCount: 0,
  isHistoryExpanded: false,
  composer: "",
  selectedModel: null,
  selectedEffort: null,
  isStreaming: false,
};

const MESSAGES: MessagesByWindowId = {
  root: [],
  child: [],
};

const SCROLL_STATE: Record<string, WindowScrollState> = {
  root: {
    scrollTop: null,
    shouldAutoScroll: true,
  },
  child: {
    scrollTop: null,
    shouldAutoScroll: true,
  },
};

function renderChatCanvas(mainWindow: WindowRecord | null) {
  return renderToStaticMarkup(
    <ChatCanvas
      anchorGroupsByMessageKey={{} as AnchorGroupsByMessageKey}
      canvasRef={{ current: null }}
      isPaneResizing={false}
      leftPaneWidthPx={null}
      mainWindow={mainWindow}
      messagesByWindowId={MESSAGES}
      onCanvasPointerDown={() => {}}
      onComposerChange={() => {}}
      onEffortChange={() => {}}
      onGeometryChange={() => {}}
      onHeaderPointerDown={() => {}}
      onMessageMouseDown={() => {}}
      onModelChange={() => {}}
      onNavigateToBranchSource={() => {}}
      onOpenFreshRootWindow={() => {}}
      onPaneResizePointerDown={() => {}}
      onResizePointerDown={() => {}}
      onRetry={() => {}}
      onSend={() => {}}
      onToggleHistoryExpanded={() => {}}
      onWindowClose={() => {}}
      onWindowFocus={() => {}}
      onWindowScrollStateChange={() => {}}
      registerAnchorRef={() => {}}
      registerWindowRef={() => {}}
      splitPaneRef={{ current: null }}
      viewport={VIEWPORT}
      windowScrollStates={SCROLL_STATE}
      windows={[CHILD_WINDOW]}
    />,
  );
}

describe("ChatCanvas", () => {
  it("uses PaperSurface for the fixed notebook pane and shows the root GitHub link", () => {
    const markup = renderChatCanvas(ROOT_WINDOW);

    expect(markup.match(/data-paper-surface="true"/g)?.length).toBe(1);
    expect(markup).toContain('data-paper-surface-content="true"');
    expect(markup).toContain('class="paper-surface relative overflow-hidden h-full min-h-0 min-w-0"');
    expect(markup).toContain('group/chat-window absolute origin-top-left');
    expect(markup).toContain('paper-texture-window pointer-events-none absolute inset-0 z-0');
    expect(markup).toContain('data-resize-handle="top"');
    expect(markup).toContain('data-resize-handle="top-left"');
    expect(markup).toContain('data-resize-handle="top-right"');
    expect(markup).toContain('data-resize-handle="bottom"');
    expect(markup).toContain('inset-x-5 top-0 z-40 h-3 cursor-n-resize');
    expect(markup).toContain('left-0 top-0 z-40 h-5 w-5 cursor-nwse-resize');
    expect(markup).toContain('right-0 top-0 z-40 h-5 w-5 cursor-nesw-resize');
    expect(markup.match(/data-resize-handle=/g)?.length).toBe(8);
    expect(markup).toContain('absolute right-10 top-8 z-30');
    expect(markup).toContain('aria-label="Open Sidequest on GitHub"');
    expect(markup).toContain('href="https://github.com/tkim90/sidequest"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer noopener"');
    expect(markup).not.toContain('data-sidequest-handwriting=');
  });

  it("does not render the root GitHub link for non-root titles", () => {
    const markup = renderChatCanvas({
      ...ROOT_WINDOW,
      title: "Research notes",
    });

    expect(markup).not.toContain('aria-label="Open Sidequest on GitHub"');
    expect(markup).not.toContain('href="https://github.com/tkim90/sidequest"');
  });
});

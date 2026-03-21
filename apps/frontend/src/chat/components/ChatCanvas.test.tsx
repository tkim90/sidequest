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
  title: "Chat 1",
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

describe("ChatCanvas", () => {
  it("uses PaperSurface for the fixed notebook pane without changing floating panes", () => {
    const markup = renderToStaticMarkup(
      <ChatCanvas
        anchorGroupsByMessageKey={{} as AnchorGroupsByMessageKey}
        canvasRef={{ current: null }}
        connectorPaths={[]}
        isPaneResizing={false}
        leftPaneWidthPx={null}
        mainWindow={ROOT_WINDOW}
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

    expect(markup.match(/data-paper-surface="true"/g)?.length).toBe(1);
    expect(markup).toContain('data-paper-surface-content="true"');
    expect(markup).toContain('class="paper-surface relative overflow-hidden h-full min-h-0 min-w-0"');
    expect(markup).toContain('group/chat-window absolute origin-top-left');
    expect(markup).toContain('paper-texture-window pointer-events-none absolute inset-0 z-0');
  });
});

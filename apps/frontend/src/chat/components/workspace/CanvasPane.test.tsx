import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type {
  AnchorGroupsByMessageKey,
  Viewport,
  WindowRecord,
} from "../../../types";
import type { FloatingWindowPresenceEntry } from "../../hooks/useFloatingWindowPresence";
import CanvasPane from "./CanvasPane";

const VIEWPORT: Viewport = { x: 0, y: 0, scale: 1, zoom: 1 };
const noop = () => {};

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

const FLOATING_ENTRY: FloatingWindowPresenceEntry = {
  enterKind: "newNote",
  isExiting: false,
  messages: [],
  savedScrollState: { scrollTop: null, shouldAutoScroll: true },
  windowData: CHILD_WINDOW,
  zIndex: 1,
};

describe("CanvasPane", () => {
  it("renders the GitHub logo when mainWindowTitle is the root title", () => {
    const markup = renderToStaticMarkup(
      <CanvasPane
        anchorGroupsByMessageKey={{} as AnchorGroupsByMessageKey}
        canvasRef={{ current: null }}
        floatingWindowEntries={[]}
        liveWindowCount={0}
        mainWindowTitle="Sidequest"
        onCanvasPointerDown={noop}
        onCanvasWheel={noop}
        onComposerChange={noop}
        onEffortChange={noop}
        onGeometryChange={noop}
        onHeaderPointerDown={noop}
        onMessageMouseDown={noop}
        onModelChange={noop}
        onNavigateToBranchSource={noop}
        onOpenFreshRootWindow={noop}
        onResizePointerDown={noop}
        onRetry={noop}
        onSend={noop}
        onToggleHistoryExpanded={noop}
        onWindowClose={noop}
        onWindowFocus={noop}
        onWindowScrollStateChange={noop}
        registerAnchorRef={noop}
        registerWindowRef={noop}
        viewport={VIEWPORT}
      />,
    );

    expect(markup).toContain('aria-label="Open Sidequest on GitHub"');
    expect(markup).toContain('src="/new-note.png"');
  });

  it("does not render the GitHub logo for a non-root title", () => {
    const markup = renderToStaticMarkup(
      <CanvasPane
        anchorGroupsByMessageKey={{} as AnchorGroupsByMessageKey}
        canvasRef={{ current: null }}
        floatingWindowEntries={[]}
        liveWindowCount={0}
        mainWindowTitle="Research notes"
        onCanvasPointerDown={noop}
        onCanvasWheel={noop}
        onComposerChange={noop}
        onEffortChange={noop}
        onGeometryChange={noop}
        onHeaderPointerDown={noop}
        onMessageMouseDown={noop}
        onModelChange={noop}
        onNavigateToBranchSource={noop}
        onOpenFreshRootWindow={noop}
        onResizePointerDown={noop}
        onRetry={noop}
        onSend={noop}
        onToggleHistoryExpanded={noop}
        onWindowClose={noop}
        onWindowFocus={noop}
        onWindowScrollStateChange={noop}
        registerAnchorRef={noop}
        registerWindowRef={noop}
        viewport={VIEWPORT}
      />,
    );

    expect(markup).not.toContain('aria-label="Open Sidequest on GitHub"');
  });

  it("renders binder marks and the Add new note button", () => {
    const markup = renderToStaticMarkup(
      <CanvasPane
        anchorGroupsByMessageKey={{} as AnchorGroupsByMessageKey}
        canvasRef={{ current: null }}
        floatingWindowEntries={[]}
        liveWindowCount={0}
        mainWindowTitle="Sidequest"
        onCanvasPointerDown={noop}
        onCanvasWheel={noop}
        onComposerChange={noop}
        onEffortChange={noop}
        onGeometryChange={noop}
        onHeaderPointerDown={noop}
        onMessageMouseDown={noop}
        onModelChange={noop}
        onNavigateToBranchSource={noop}
        onOpenFreshRootWindow={noop}
        onResizePointerDown={noop}
        onRetry={noop}
        onSend={noop}
        onToggleHistoryExpanded={noop}
        onWindowClose={noop}
        onWindowFocus={noop}
        onWindowScrollStateChange={noop}
        registerAnchorRef={noop}
        registerWindowRef={noop}
        viewport={VIEWPORT}
      />,
    );

    // Binder marks: 3 circles + 4 capsules
    const circleCount = (markup.match(/h-4 w-4 rounded-full/g) ?? []).length;
    const capsuleCount = (markup.match(/h-8 w-4 rounded-full/g) ?? []).length;
    expect(circleCount).toBe(3);
    expect(capsuleCount).toBe(4);

    expect(markup).toContain('aria-label="Add new note"');
  });

  it("renders floating window entries with resize handles", () => {
    const markup = renderToStaticMarkup(
      <CanvasPane
        anchorGroupsByMessageKey={{} as AnchorGroupsByMessageKey}
        canvasRef={{ current: null }}
        floatingWindowEntries={[FLOATING_ENTRY]}
        liveWindowCount={1}
        mainWindowTitle="Sidequest"
        onCanvasPointerDown={noop}
        onCanvasWheel={noop}
        onComposerChange={noop}
        onEffortChange={noop}
        onGeometryChange={noop}
        onHeaderPointerDown={noop}
        onMessageMouseDown={noop}
        onModelChange={noop}
        onNavigateToBranchSource={noop}
        onOpenFreshRootWindow={noop}
        onResizePointerDown={noop}
        onRetry={noop}
        onSend={noop}
        onToggleHistoryExpanded={noop}
        onWindowClose={noop}
        onWindowFocus={noop}
        onWindowScrollStateChange={noop}
        registerAnchorRef={noop}
        registerWindowRef={noop}
        viewport={VIEWPORT}
      />,
    );

    expect(markup).toContain("data-chat-window");
    expect(markup).toContain("data-resize-handle");
    expect(markup).toContain('aria-label="Close note"');
  });
});

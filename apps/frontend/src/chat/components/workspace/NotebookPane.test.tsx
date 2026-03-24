import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type {
  AnchorGroupsByMessageKey,
  WindowRecord,
  WindowScrollState,
} from "../../../types";
import NotebookPane from "./NotebookPane";

const ROOT_WINDOW: WindowRecord = {
  id: "root",
  title: "Sidequest",
  x: 0,
  y: 0,
  width: 720,
  height: 800,
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
};

const SCROLL_STATE: WindowScrollState = {
  scrollTop: null,
  shouldAutoScroll: true,
};

const noop = () => {};

describe("NotebookPane", () => {
  it("renders the fixed notebook pane with a PaperSurface wrapper", () => {
    const markup = renderToStaticMarkup(
      <NotebookPane
        anchorGroupsByMessageKey={{} as AnchorGroupsByMessageKey}
        mainWindow={ROOT_WINDOW}
        messages={[]}
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
        onWindowClose={noop}
        onWindowFocus={noop}
        onWindowScrollStateChange={noop}
        registerAnchorRef={noop}
        registerWindowRef={noop}
        savedScrollState={SCROLL_STATE}
      />,
    );

    expect(markup).toContain("notebook-pane");
    expect(markup).toContain('data-paper-surface="true"');
    expect(markup).toContain("data-chat-window");
  });

  it("renders nothing inside the paper surface when mainWindow is null", () => {
    const markup = renderToStaticMarkup(
      <NotebookPane
        anchorGroupsByMessageKey={{} as AnchorGroupsByMessageKey}
        mainWindow={null}
        messages={[]}
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
        onWindowClose={noop}
        onWindowFocus={noop}
        onWindowScrollStateChange={noop}
        registerAnchorRef={noop}
        registerWindowRef={noop}
        savedScrollState={SCROLL_STATE}
      />,
    );

    expect(markup).toContain("notebook-pane");
    expect(markup).toContain('data-paper-surface="true"');
    expect(markup).not.toContain("data-chat-window");
  });

  it("renders the ChatWindow as a fixed pane without floating-note chrome", () => {
    const markup = renderToStaticMarkup(
      <NotebookPane
        anchorGroupsByMessageKey={{} as AnchorGroupsByMessageKey}
        mainWindow={ROOT_WINDOW}
        messages={[]}
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
        onWindowClose={noop}
        onWindowFocus={noop}
        onWindowScrollStateChange={noop}
        registerAnchorRef={noop}
        registerWindowRef={noop}
        savedScrollState={SCROLL_STATE}
      />,
    );

    // Fixed pane should not have floating window chrome
    expect(markup).not.toContain("paper-texture-window");
    expect(markup).not.toContain("data-resize-handle");
    expect(markup).not.toContain('aria-label="Close note"');
  });
});

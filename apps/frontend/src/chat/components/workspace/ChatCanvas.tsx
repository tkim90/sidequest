import type { CSSProperties } from "react";

import type {
  AnchorGroupsByMessageKey,
  MessageRecord,
  MessagesByWindowId,
  Viewport,
  WindowScrollState,
  WindowRecord,
} from "../../../types";
import type { ResizeEdges } from "../../hooks/canvasTypes";
import { PANE_SEPARATOR_WIDTH } from "../../lib/constants";
import { useFloatingWindowPresence } from "../../hooks/useFloatingWindowPresence";
import CanvasPane from "./CanvasPane";
import MobileNotesOverlay from "./MobileNotesOverlay";
import NotebookPane from "./NotebookPane";
import SplitPaneDivider from "./SplitPaneDivider";

const EMPTY_MESSAGES: MessageRecord[] = [];
const DEFAULT_SCROLL_STATE: WindowScrollState = {
  scrollTop: null,
  shouldAutoScroll: true,
};

interface ChatCanvasProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  isPaneResizing: boolean;
  isMobileNotesOpen: boolean;
  isMobileView: boolean;
  leftPaneWidthPx: number | null;
  mainWindow: WindowRecord | null;
  messagesByWindowId: MessagesByWindowId;
  onCanvasPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onCanvasWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
  onComposerChange: (windowId: string, composer: string) => void;
  onGeometryChange: () => void;
  onHeaderPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
  ) => void;
  onModelChange: (windowId: string, model: string) => void;
  onOpenFreshRootWindow: () => void;
  onPaneResizePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onEffortChange: (
    windowId: string,
    effort: WindowRecord["selectedEffort"],
  ) => void;
  onResizePointerDown: (
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
    edges: ResizeEdges,
  ) => void;
  onMessageMouseDown: (
    event: React.MouseEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
  onNavigateToBranchSource: (
    windowId: string,
    branchAnchorId: string | null,
  ) => void;
  onRetry: (windowId: string, messageId: string) => void | Promise<void>;
  onSend: (windowId: string, promptOverride?: string) => void | Promise<void>;
  onMobileNotesClose: () => void;
  onToggleHistoryExpanded: (windowId: string) => void;
  onWindowClose: (windowId: string) => void;
  onWindowFocus: (windowId: string) => void;
  onWindowScrollStateChange: (
    windowId: string,
    nextState: WindowScrollState,
  ) => void;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  registerWindowRef: (windowId: string, node: HTMLElement | null) => void;
  splitPaneRef: React.RefObject<HTMLDivElement | null>;
  viewport: Viewport;
  windowScrollStates: Record<string, WindowScrollState>;
  windows: WindowRecord[];
}

function ChatCanvas({
  anchorGroupsByMessageKey,
  canvasRef,
  isPaneResizing,
  isMobileNotesOpen,
  isMobileView,
  leftPaneWidthPx,
  mainWindow,
  messagesByWindowId,
  onCanvasPointerDown,
  onCanvasWheel,
  onComposerChange,
  onGeometryChange,
  onHeaderPointerDown,
  onModelChange,
  onOpenFreshRootWindow,
  onPaneResizePointerDown,
  onEffortChange,
  onResizePointerDown,
  onMessageMouseDown,
  onNavigateToBranchSource,
  onRetry,
  onSend,
  onMobileNotesClose,
  onToggleHistoryExpanded,
  onWindowClose,
  onWindowFocus,
  onWindowScrollStateChange,
  registerAnchorRef,
  registerWindowRef,
  splitPaneRef,
  viewport,
  windowScrollStates,
  windows,
}: ChatCanvasProps) {
  const floatingWindowEntries = useFloatingWindowPresence({
    messagesByWindowId,
    windows,
    windowScrollStates,
  });

  const splitPaneStyle = {
    "--chat-split-columns": leftPaneWidthPx
      ? `${leftPaneWidthPx}px ${PANE_SEPARATOR_WIDTH}px minmax(0, 1fr)`
      : `minmax(420px, 44%) ${PANE_SEPARATOR_WIDTH}px minmax(0, 1fr)`,
  } as CSSProperties;

  return (
    <div
      className="relative grid h-full min-h-0 grid-cols-1 overflow-hidden bg-background lg:[grid-template-columns:var(--chat-split-columns)]"
      ref={splitPaneRef}
      style={splitPaneStyle}
    >
      <NotebookPane
        anchorGroupsByMessageKey={anchorGroupsByMessageKey}
        mainWindow={mainWindow}
        messages={
          mainWindow
            ? messagesByWindowId[mainWindow.id] ?? EMPTY_MESSAGES
            : EMPTY_MESSAGES
        }
        onComposerChange={onComposerChange}
        onEffortChange={onEffortChange}
        onGeometryChange={onGeometryChange}
        onHeaderPointerDown={onHeaderPointerDown}
        onMessageMouseDown={onMessageMouseDown}
        onModelChange={onModelChange}
        onNavigateToBranchSource={onNavigateToBranchSource}
        onResizePointerDown={onResizePointerDown}
        onRetry={onRetry}
        onSend={onSend}
        onToggleHistoryExpanded={onToggleHistoryExpanded}
        onWindowClose={onWindowClose}
        onWindowFocus={onWindowFocus}
        onWindowScrollStateChange={onWindowScrollStateChange}
        registerAnchorRef={registerAnchorRef}
        registerWindowRef={registerWindowRef}
        savedScrollState={
          mainWindow
            ? windowScrollStates[mainWindow.id] ?? DEFAULT_SCROLL_STATE
            : DEFAULT_SCROLL_STATE
        }
        removeVerticalPadding={isMobileView}
      />

      {isMobileView ? null : (
        <>
          <SplitPaneDivider
            isResizing={isPaneResizing}
            onPointerDown={onPaneResizePointerDown}
          />

          <CanvasPane
            anchorGroupsByMessageKey={anchorGroupsByMessageKey}
            canvasRef={canvasRef}
            floatingWindowEntries={floatingWindowEntries}
            liveWindowCount={windows.length}
            mainWindowTitle={mainWindow?.title ?? null}
            onCanvasPointerDown={onCanvasPointerDown}
            onCanvasWheel={onCanvasWheel}
            onComposerChange={onComposerChange}
            onEffortChange={onEffortChange}
            onGeometryChange={onGeometryChange}
            onHeaderPointerDown={onHeaderPointerDown}
            onMessageMouseDown={onMessageMouseDown}
            onModelChange={onModelChange}
            onNavigateToBranchSource={onNavigateToBranchSource}
            onOpenFreshRootWindow={onOpenFreshRootWindow}
            onResizePointerDown={onResizePointerDown}
            onRetry={onRetry}
            onSend={onSend}
            onToggleHistoryExpanded={onToggleHistoryExpanded}
            onWindowClose={onWindowClose}
            onWindowFocus={onWindowFocus}
            onWindowScrollStateChange={onWindowScrollStateChange}
            registerAnchorRef={registerAnchorRef}
            registerWindowRef={registerWindowRef}
            viewport={viewport}
          />
        </>
      )}

      {isMobileView && isMobileNotesOpen ? (
        <MobileNotesOverlay
          anchorGroupsByMessageKey={anchorGroupsByMessageKey}
          entries={floatingWindowEntries}
          onCloseOverlay={onMobileNotesClose}
          onCloseWindow={onWindowClose}
          onComposerChange={onComposerChange}
          onEffortChange={onEffortChange}
          onGeometryChange={onGeometryChange}
          onHeaderPointerDown={onHeaderPointerDown}
          onMessageMouseDown={onMessageMouseDown}
          onModelChange={onModelChange}
          onNavigateToBranchSource={onNavigateToBranchSource}
          onOpenFreshRootWindow={onOpenFreshRootWindow}
          onResizePointerDown={onResizePointerDown}
          onRetry={onRetry}
          onSend={onSend}
          onToggleHistoryExpanded={onToggleHistoryExpanded}
          onWindowFocus={onWindowFocus}
          onWindowScrollStateChange={onWindowScrollStateChange}
          registerAnchorRef={registerAnchorRef}
          registerWindowRef={registerWindowRef}
        />
      ) : null}
    </div>
  );
}

export default ChatCanvas;

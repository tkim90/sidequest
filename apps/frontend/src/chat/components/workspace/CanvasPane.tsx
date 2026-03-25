import type { CSSProperties } from "react";

import type {
  AnchorGroupsByMessageKey,
  Viewport,
  WindowRecord,
  WindowScrollState,
} from "../../../types";
import type { ResizeEdges } from "../../hooks/canvasTypes";
import type { FloatingWindowPresenceEntry } from "../../hooks/useFloatingWindowPresence";
import {
  getViewportEffectiveScale,
  snapToDevicePixel,
} from "../../hooks/canvasUtils";
import { ROOT_WINDOW_TITLE } from "../../lib/constants";
import AddNewNoteButton from "./AddNewNoteButton";
import FloatingNoteStack from "./FloatingNoteStack";
import GithubLogo from "../shared/GithubLogo";
import NotebookBinderMarks from "./NotebookBinderMarks";
import WorkspaceGridCanvas from "./WorkspaceGridCanvas";

const NOTEBOOK_GUTTER_WIDTH_PX = 68;

interface CanvasPaneProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  floatingWindowEntries: FloatingWindowPresenceEntry[];
  liveWindowCount: number;
  mainWindowTitle: string | null;
  onCanvasPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onCanvasWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
  onComposerChange: (windowId: string, composer: string) => void;
  onEffortChange: (
    windowId: string,
    effort: WindowRecord["selectedEffort"],
  ) => void;
  onGeometryChange: () => void;
  onHeaderPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
  ) => void;
  onMessageMouseDown: (
    event: React.PointerEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
  onModelChange: (windowId: string, model: string) => void;
  onNavigateToBranchSource: (
    windowId: string,
    branchAnchorId: string | null,
  ) => void;
  onOpenFreshRootWindow: () => void;
  onResizePointerDown: (
    event: React.PointerEvent<HTMLElement>,
    windowId: string,
    edges: ResizeEdges,
  ) => void;
  onRetry: (windowId: string, messageId: string) => void | Promise<void>;
  onSend: (windowId: string, promptOverride?: string) => void | Promise<void>;
  onToggleHistoryExpanded: (windowId: string) => void;
  onWindowClose: (windowId: string) => void;
  onWindowFocus: (windowId: string) => void;
  onWindowScrollStateChange: (
    windowId: string,
    nextState: WindowScrollState,
  ) => void;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  registerWindowRef: (windowId: string, node: HTMLElement | null) => void;
  viewport: Viewport;
}

function CanvasPane({
  anchorGroupsByMessageKey,
  canvasRef,
  floatingWindowEntries,
  liveWindowCount,
  mainWindowTitle,
  onCanvasPointerDown,
  onCanvasWheel,
  onComposerChange,
  onEffortChange,
  onGeometryChange,
  onHeaderPointerDown,
  onMessageMouseDown,
  onModelChange,
  onNavigateToBranchSource,
  onOpenFreshRootWindow,
  onResizePointerDown,
  onRetry,
  onSend,
  onToggleHistoryExpanded,
  onWindowClose,
  onWindowFocus,
  onWindowScrollStateChange,
  registerAnchorRef,
  registerWindowRef,
  viewport,
}: CanvasPaneProps) {
  const effectiveScale = getViewportEffectiveScale(viewport);
  const snappedViewportX = snapToDevicePixel(viewport.x);
  const snappedViewportY = snapToDevicePixel(viewport.y);

  return (
    <div className="relative z-10 min-h-0 overflow-hidden bg-paper-raised/45">
      <div className="paper-texture relative h-full overflow-hidden bg-paper-sheet">
        {mainWindowTitle === ROOT_WINDOW_TITLE ? (
          <GithubLogo className="absolute right-10 top-6 z-30" />
        ) : null}
        <NotebookBinderMarks gutterWidthPx={NOTEBOOK_GUTTER_WIDTH_PX} />

        <AddNewNoteButton onClick={onOpenFreshRootWindow} />

        <div
          className="absolute overflow-hidden border-b border-r border-paper-stroke/30"
          ref={canvasRef}
          style={
            {
              top: "1rem",
              right: "2rem",
              bottom: "1rem",
              left: `${NOTEBOOK_GUTTER_WIDTH_PX}px`,
              "--paper": "var(--paper-sheet)",
            } as CSSProperties
          }
          onPointerDown={onCanvasPointerDown}
          onWheel={onCanvasWheel}
        >
          <WorkspaceGridCanvas hostRef={canvasRef} viewport={viewport} />

          <div
            className="absolute inset-0 origin-top-left"
            style={{
              transform: `translate(${snappedViewportX}px, ${snappedViewportY}px)`,
            }}
          >
            <div
              className="relative min-h-full min-w-full origin-top-left"
              style={{
                zoom: effectiveScale,
              }}
            >
              <FloatingNoteStack
                anchorGroupsByMessageKey={anchorGroupsByMessageKey}
                entries={floatingWindowEntries}
                liveWindowCount={liveWindowCount}
                onClose={onWindowClose}
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
                onWindowFocus={onWindowFocus}
                onWindowScrollStateChange={onWindowScrollStateChange}
                registerAnchorRef={registerAnchorRef}
                registerWindowRef={registerWindowRef}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CanvasPane;

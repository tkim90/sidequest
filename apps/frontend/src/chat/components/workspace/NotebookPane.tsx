import type {
  AnchorGroupsByMessageKey,
  MessageRecord,
  WindowScrollState,
  WindowRecord,
} from "../../../types";
import type { ResizeEdges } from "../../hooks/canvasTypes";
import ChatWindow from "../window/ChatWindow";
import PaperSurface from "./PaperSurface";

interface NotebookPaneProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  mainWindow: WindowRecord | null;
  messages: MessageRecord[];
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
    event: React.MouseEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
  onModelChange: (windowId: string, model: string) => void;
  onNavigateToBranchSource: (
    windowId: string,
    branchAnchorId: string | null,
  ) => void;
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
  removeVerticalPadding?: boolean;
  savedScrollState: WindowScrollState;
}

function NotebookPane({
  anchorGroupsByMessageKey,
  mainWindow,
  messages,
  onComposerChange,
  onEffortChange,
  onGeometryChange,
  onHeaderPointerDown,
  onMessageMouseDown,
  onModelChange,
  onNavigateToBranchSource,
  onResizePointerDown,
  onRetry,
  onSend,
  onToggleHistoryExpanded,
  onWindowClose,
  onWindowFocus,
  onWindowScrollStateChange,
  registerAnchorRef,
  registerWindowRef,
  removeVerticalPadding = false,
  savedScrollState,
}: NotebookPaneProps) {
  return (
    <aside className="notebook-pane group/notebook relative z-10 min-h-0 min-w-0 overflow-hidden border-b border-border lg:border-b-0">
      <PaperSurface
        className="h-full min-h-0 min-w-0"
        contentClassName="flex h-full min-h-0 min-w-0 flex-col px-4"
        intensity="default"
      >
        {mainWindow ? (
          <div
            className={[
              "min-h-0 min-w-0 flex-1",
              removeVerticalPadding ? null : "py-4",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <ChatWindow
              anchorGroupsByMessageKey={anchorGroupsByMessageKey}
              isFixedPane
              isFocused
              messages={messages}
              onClose={onWindowClose}
              onComposerChange={onComposerChange}
              onEffortChange={onEffortChange}
              onGeometryChange={onGeometryChange}
              onHeaderPointerDown={onHeaderPointerDown}
              onMessageMouseDown={onMessageMouseDown}
              onNavigateToBranchSource={onNavigateToBranchSource}
              onModelChange={onModelChange}
              onResizePointerDown={onResizePointerDown}
              onRetry={onRetry}
              onSend={onSend}
              onToggleHistoryExpanded={onToggleHistoryExpanded}
              onWindowFocus={onWindowFocus}
              onWindowScrollStateChange={onWindowScrollStateChange}
              registerAnchorRef={registerAnchorRef}
              registerWindowRef={registerWindowRef}
              savedScrollState={savedScrollState}
              windowData={mainWindow}
              zIndex={100}
            />
          </div>
        ) : null}
      </PaperSurface>
    </aside>
  );
}

export default NotebookPane;

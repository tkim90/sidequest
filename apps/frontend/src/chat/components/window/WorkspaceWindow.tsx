import type {
  AnchorGroupsByMessageKey,
  WindowRecord,
  WindowScrollState,
} from "../../../types";
import type { ResizeEdges } from "../../hooks/canvasTypes";
import type { FloatingWindowPresenceEntry } from "../../hooks/useFloatingWindowPresence";
import ChatWindow from "./ChatWindow";
import VisualizationWindow from "./VisualizationWindow";

interface WorkspaceWindowProps {
  anchorGroupsByMessageKey: AnchorGroupsByMessageKey;
  alwaysShowCloseButton?: boolean;
  entry: FloatingWindowPresenceEntry;
  isFixedPane?: boolean;
  isFocused: boolean;
  mobileInteractionMode?: "scroll" | "scroll-first-swipe";
  onClose: (windowId: string) => void;
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
  onMobileBodyPointerDown?: React.ComponentProps<"div">["onPointerDown"];
  onMobileHeaderPointerDown?: React.ComponentProps<"header">["onPointerDown"];
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
  onWindowFocus: (windowId: string) => void;
  onWindowScrollStateChange: (
    windowId: string,
    nextState: WindowScrollState,
  ) => void;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  registerWindowRef: (windowId: string, node: HTMLElement | null) => void;
  showFixedPaneCloseButton?: boolean;
}

function WorkspaceWindow({
  anchorGroupsByMessageKey,
  alwaysShowCloseButton = false,
  entry,
  isFixedPane = false,
  isFocused,
  mobileInteractionMode,
  onClose,
  onComposerChange,
  onEffortChange,
  onGeometryChange,
  onHeaderPointerDown,
  onMessageMouseDown,
  onMobileBodyPointerDown,
  onMobileHeaderPointerDown,
  onModelChange,
  onNavigateToBranchSource,
  onResizePointerDown,
  onRetry,
  onSend,
  onToggleHistoryExpanded,
  onWindowFocus,
  onWindowScrollStateChange,
  registerAnchorRef,
  registerWindowRef,
  showFixedPaneCloseButton = false,
}: WorkspaceWindowProps) {
  if (entry.windowData.kind === "visualization") {
    return (
      <VisualizationWindow
        alwaysShowCloseButton={alwaysShowCloseButton}
        isFixedPane={isFixedPane}
        isFocused={isFocused}
        mobileInteractionMode={mobileInteractionMode}
        onClose={onClose}
        onHeaderPointerDown={onHeaderPointerDown}
        onMobileBodyPointerDown={onMobileBodyPointerDown}
        onMobileHeaderPointerDown={onMobileHeaderPointerDown}
        onNavigateToBranchSource={onNavigateToBranchSource}
        onResizePointerDown={onResizePointerDown}
        onWindowFocus={onWindowFocus}
        registerWindowRef={registerWindowRef}
        showFixedPaneCloseButton={showFixedPaneCloseButton}
        visualization={entry.visualization}
        windowData={entry.windowData}
        zIndex={entry.zIndex}
      />
    );
  }

  return (
    <ChatWindow
      anchorGroupsByMessageKey={anchorGroupsByMessageKey}
      alwaysShowCloseButton={alwaysShowCloseButton}
      isFixedPane={isFixedPane}
      isFocused={isFocused}
      messages={entry.messages}
      mobileInteractionMode={mobileInteractionMode}
      onClose={onClose}
      onComposerChange={onComposerChange}
      onEffortChange={onEffortChange}
      onGeometryChange={onGeometryChange}
      onHeaderPointerDown={onHeaderPointerDown}
      onMessageMouseDown={onMessageMouseDown}
      onMobileBodyPointerDown={onMobileBodyPointerDown}
      onMobileHeaderPointerDown={onMobileHeaderPointerDown}
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
      savedScrollState={entry.savedScrollState}
      showFixedPaneCloseButton={showFixedPaneCloseButton}
      windowData={entry.windowData}
      zIndex={entry.zIndex}
    />
  );
}

export default WorkspaceWindow;
